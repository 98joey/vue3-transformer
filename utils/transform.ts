import { vmContentType, ComputedFunItem } from "./types";
import {
  parseAndReplaceVue2Ref,
  transVue2Ref,
  transComponents,
  transClassMethodsAndProp,
  appendReturnToSetup,
  replaceVue2Route,
  replaceI18nT,
  replaceNextTick,
  replaceThisComputed,
  replaceThisClassMethod,
  replaceThisProperty,
  replaceOptionProps
} from "./transformUtils";
import { findScriptAst } from "./classMethodsUtils";
import { collectEmitsTypes, replaceVue2Emit } from "./emitsOption";

export default function transform(
  fileInfo,
  api: { gogocode: any },
  options: {
    defineComponentAst: any;
    filePath: string;
  }
) {
  const vmContent: vmContentType = {
    computedFun: [] as ComputedFunItem[],
    emitsTypes: [], // vue3里emit的内容，如['change', 'update:modelValue']
    watchFunNames: [],
    methodsFunNames: [],
    stateDataNames: [],
    propsNames: [],
    // setup的Return语句的内容
    setupReturnContent: ["t", "state"] as string[],
    refsNames: [],
    initExpressions: [] as string[], // 初始化的代码，也就是在setup的return之前执行的代码。
  };

  let sourceCode = fileInfo.source;
  const $ = api.gogocode;
  let astOrg;
  // 解析并替换this.$refs.xxx。提前解析出所有的$ref，这样才能方便在setup里插入
  sourceCode = parseAndReplaceVue2Ref(sourceCode, api, options, { vmContent });
  if (/\.vue$/.test(fileInfo.path)) {
    astOrg = $(sourceCode, { parseOptions: { language: "vue" } });
  } else {
    astOrg = $(sourceCode);
  }
  // astOrg = /\.json$/.test(fileInfo.path)
  //   ? sourceCode
  //   : /\.vue$/.test(fileInfo.path)
  //     ? $(sourceCode, { parseOptions: { language: 'vue' } })
  //     : $(sourceCode);
  const script = findScriptAst(astOrg);
  const classAst = script.find("class $_$0 { $$$1 }");

  // 在vue3的setup里插入ref，尽量靠前执行，紧挨着state
  transVue2Ref(astOrg, api, options, { vmContent });
  // 收集vue2的$emit的类型
  collectEmitsTypes(astOrg, api, options, { vmContent });
  // 转换@Component里的components，要放在transClassMethodsAndProp之前调用，因为要先往setup里插入东西
  transComponents(astOrg, api, options, { vmContent });
  // 转换class里的方法和属性
  transClassMethodsAndProp(astOrg, api, options, { vmContent });
  // 最后，向setup插入return语句，并在return之前，插入需要执行的表达式语句。插入emits语句
  appendReturnToSetup(astOrg, api, options, { vmContent });

  // 用vue3的代码替换vue2的class。
  classAst.replaceBy(options.defineComponentAst);

  //   // 转换为vue3的代码后，再转换element-ui为element-plus
  //   transformEleByAstAfterVue3(astOrg, api, options, { vmContent });
  //   // 转换为vue3的代码后，转换vant的代码
  //   transformVantByAstAfterVue3(astOrg, api, options, { vmContent });
  let newSourceCode = astOrg.generate();

  // 统一替换$emit。
  newSourceCode = replaceVue2Emit(newSourceCode, api, options, { vmContent });
  // 替换vue2里的$route,$router,this.$route,this.$router
  newSourceCode = replaceVue2Route(newSourceCode, api, options, { vmContent });
  // 替换vue2里的this.$t,$t,i18n.t
  newSourceCode = replaceI18nT(newSourceCode, api, options, { vmContent });
  // 替换vue2里的this.$nextTick
  newSourceCode = replaceNextTick(newSourceCode, api, options, { vmContent });
  // 替换this.计算属性名字
  newSourceCode = replaceThisComputed(newSourceCode, api, options, { vmContent });
  // 替换this.方法名字
  newSourceCode = replaceThisClassMethod(newSourceCode, api, options, { vmContent });
  // 替换this.属性名字
  newSourceCode = replaceThisProperty(newSourceCode, api, options, { vmContent });
  // 查找vue2里的props.xxx
  newSourceCode = replaceOptionProps(newSourceCode, api, options, { vmContent });
  // 通过字符串替换的方式，转换vant的代码
//   newSourceCode = transformVantByCodeAfterVue3(newSourceCode, api, options, { vmContent });
//   // 通过字符串替换的方式，转换element的代码
//   newSourceCode = transformEleByCodeAfterVue3(newSourceCode, api, options, { vmContent });
  return newSourceCode;
}
