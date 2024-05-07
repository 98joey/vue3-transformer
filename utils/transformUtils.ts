import * as babelTypes from '@babel/types'
import { ClassMethod, ClassProperty, Identifier, ObjectMethod, ObjectProperty, TSTypeAnnotation } from '@babel/types'
import {
  convertTsTypeToVue3String, findComputedFunByName,
  findDecoratorByName,
  findObjectPropertyByName, findPropertyByName, findScriptAst,
  genV3HooksNameDist,
  getArgumentsStrFromFuncAst,
  getClassMethodName,
  isEmitMethod,
  isGetOrSetMethod,
  isVue2Hooks, isVueRouterHook,
  isWatchMethod,
  parseClassPropertyAsType,
  parseTsAsPropType,
  removeDecoratorByName,
  replaceLastOfStr,
  transClassMethodToArrowFunc,
  transClassMethodToFunc,
  transGetOrSetFuncToArrowFunc, transObjectPropertyToArrowFunc
} from './classMethodsUtils'
import { ComputedFunItem, vmContentType } from './types'
import { collectEmitsTypes, replaceSpecialEmits, replaceVue2Emit } from './emitsOption'
import {
  capitalizeFirstLetter,
  copyCommentsFromAToB,
  mergeTrailingAndLeadingComments,
  mergeTrailingAndLeadingCommentsArr, pushToContentArr
} from '../utils/commonUtils'

// vue3里有的生命周期钩子，
const v3HooksNameDist = genV3HooksNameDist()

// 生成ComputedFunItem的key名字
export function genComputedFunKey(kind: string) {
  const result = kind === 'set' ? 'setNode' : 'getNode'
  return result
}

// 在vue3的setup里插入ref，尽量靠前执行，紧挨着state
export function transVue2Ref(astOrg, api: { gogocode: any }, options: {
  defineComponentAst: any;
}, state: { vmContent: vmContentType }) {
  const defineComponentAst = options.defineComponentAst
  const setupAst = defineComponentAst.find('setup($_$0) {$$$1}')

  const vmContent = state.vmContent
  let tmpCode
  for (let i = 0, il = vmContent.refsNames.length; i < il; i++) {
    tmpCode = 'const ' + vmContent.refsNames[i] + ' = ref()'
    pushToContentArr(vmContent.refsNames[i], vmContent.setupReturnContent)
    setupAst.append('body', '\n' + tmpCode)
  }
}

// 查找vue2 class里的$ref并替换
export function replaceThisComputed(sourceCode: string, api: { gogocode: any }, options: {
  defineComponentAst: any;
}, state: { vmContent: vmContentType }) {

  if (typeof sourceCode !== 'string') {
    return
  }
  const vmContent = state.vmContent

  let tmpReg
  let tmpSourceCode = sourceCode
  for (let i = 0, il = vmContent.computedFun.length; i < il; i++) {
    // tmpReg = new RegExp('\\bthis\\.' + vmContent.computedFun[i].name +  '(\\.|\\[|\\s|\\n|$|\\\\|\\)|\\/)', 'g')
    tmpReg = new RegExp('\\bthis\\.' + vmContent.computedFun[i].name + '\\b', 'g')
    tmpSourceCode = tmpSourceCode.replace(tmpReg, (match, p1) => {
      // return vmContent.computedFun[i].name + '.value' + p1
      return vmContent.computedFun[i].name + '.value'
    })
  }
  return tmpSourceCode || sourceCode
}

// 查找vue2 class里的this.xxx()并替换
export function replaceThisClassMethod(sourceCode: string, api: { gogocode: any }, options: {
  defineComponentAst: any;
}, state: { vmContent: vmContentType }) {
  if (typeof sourceCode !== 'string') {
    return
  }
  const vmContent = state.vmContent

  let tmpReg
  let tmpSourceCode = sourceCode
  for (let i = 0, il = vmContent.methodsFunNames.length; i < il; i++) {
    tmpReg = new RegExp('\\bthis\\.' + vmContent.methodsFunNames[i] + '\\b', 'g')
    tmpSourceCode = tmpSourceCode.replace(tmpReg, (match, p1) => {
      return vmContent.methodsFunNames[i]
    })
  }
  return tmpSourceCode || sourceCode
}

// 替换vue2里的$route,$router,this.$route,this.$router
export function replaceVue2Route(sourceCode: string, api: { gogocode: any }, options: {
  defineComponentAst: any;
}, state: { vmContent: vmContentType }) {
  if (typeof sourceCode !== 'string') {
    return
  }

  // 替换this.$route
  let newCode = sourceCode.replace(/\bthis\.\$route\b/g, 'route')
  // 替换$route
  newCode = newCode.replace(/(^|[^a-zA-Z0-9_\$])\$route\b/g, (match, p1) => {
    return p1 + 'route'
  })
  // 替换this.$router
  newCode = newCode.replace(/\bthis\.\$router\b/g, 'router')
  // 替换$router
  newCode = newCode.replace(/(^|[^a-zA-Z0-9_\$])\$router\b/g, (match, p1) => {
    return p1 + 'router'
  })
  return newCode
}

// 替换vue2里的this.$t,$t,i18n.t
export function replaceI18nT(sourceCode: string, api: { gogocode: any }, options: {
  defineComponentAst: any;
}, state: { vmContent: vmContentType }) {
  if (typeof sourceCode !== 'string') {
    return
  }

  // 替换this.$t → t(
  let newCode = sourceCode.replace(/\bthis\.\$t\(/g, 't(')
  // 替换$t → t(
  newCode = newCode.replace(/(^|[^a-zA-Z0-9_\$])\$t\(/g, (match, p1, p2) => {
    return p1 + 't('
  })
  // 替换i18n.t( → t(
  newCode = newCode.replace(/\bi18n\.t\(/g, 't(')
  return newCode
}

// 替换vue2里的this.$nextTick
export function replaceNextTick(sourceCode: string, api: { gogocode: any }, options: {
  defineComponentAst: any;
}, state: { vmContent: vmContentType }) {
  if (typeof sourceCode !== 'string') {
    return
  }

  // 替换this.$nextTick( → nextTick(
  let newCode = sourceCode.replace(/\bthis\.\$nextTick\(/g, 'nextTick(')
  // 替换$nextTick → nextTick(
  newCode = newCode.replace(/(^|[^a-zA-Z0-9_\$])\$nextTick\(/g, (match, p1, p2) => {
    return p1 + 'nextTick('
  })
  return newCode
}

// 查找vue2 class里的this.xxx属性名并替换
export function replaceThisProperty(sourceCode: string, api: { gogocode: any }, options: {
  defineComponentAst: any;
}, state: { vmContent: vmContentType }) {
  if (typeof sourceCode !== 'string') {
    return
  }
  const vmContent = state.vmContent

  let tmpReg
  let tmpSourceCode = sourceCode
  for (let i = 0, il = vmContent.stateDataNames.length; i < il; i++) {
    // tmpReg = new RegExp('\\bthis\\.' + vmContent.stateDataNames[i] + '\\b([^\\(])', 'g')
    tmpReg = new RegExp('\\bthis\\.' + vmContent.stateDataNames[i] + '\\b', 'g')
    tmpSourceCode = tmpSourceCode.replace(tmpReg, (match, p1) => {
      // return 'state.' + vmContent.stateDataNames[i] + p1
      return 'state.' + vmContent.stateDataNames[i]
    })
  }
  return tmpSourceCode || sourceCode
}

// 查找vue2里的props.xxx
export function replaceOptionProps(sourceCode: string, api: { gogocode: any }, options: {
  defineComponentAst: any;
}, state: { vmContent: vmContentType }) {
  if (typeof sourceCode !== 'string') {
    return
  }
  const vmContent = state.vmContent

  let tmpReg
  let tmpSourceCode = sourceCode
  for (let i = 0, il = vmContent.propsNames.length; i < il; i++) {
    // tmpReg = new RegExp('\\bthis\\.' + vmContent.propsNames[i] + '\\b([^\\(])', 'g')
    tmpReg = new RegExp('\\bthis\\.' + vmContent.propsNames[i] + '\\b', 'g')
    tmpSourceCode = tmpSourceCode.replace(tmpReg, (match, p1) => {
      // return 'state.' + vmContent.propsNames[i] + p1
      return 'props.' + vmContent.propsNames[i]
    })
  }
  return tmpSourceCode || sourceCode
}

// 查找vue2 class里的$ref并替换
export function parseAndReplaceVue2Ref(sourceCode: string, api: { gogocode: any }, options: {
  defineComponentAst: any;
}, state: { vmContent: vmContentType }) {

  if (typeof sourceCode !== 'string') {
    return
  }
  const vmContent = state.vmContent
  // const newCode = sourceCode.replace(/\bthis\.\$refs\.([a-z0-9-_$]+?)(\.|\[|\s|\n|$|\)|\/)/gi, (match, p1, p2) => {
  const newCode = sourceCode.replace(/\bthis\.\$refs\.([a-z0-9-_$]+?)\b/gi, (match, p1, p2) => {
    p1 = p1.trim()
    pushToContentArr(p1, vmContent.refsNames)
    // return p1 + '.value' + p2
    return p1 + '.value'
  })
  return newCode
}

// 转换vue2 class里的@Prop到vue3的props里，转换vue2 class的属性到vue3的state里。
export function transClassProperties(propertyNode: ClassProperty, astOrg, api: { gogocode: any }, options: {
  defineComponentAst: any;
}, state: { vmContent: vmContentType }) {
  const defineComponentAst = options.defineComponentAst
  const $ = api.gogocode
  const propsAstLine = defineComponentAst.find('props: {}')
  const propsAst = $(propsAstLine.attr('value'))

  const vmContent = state.vmContent

  const propertyNodeAst = $(propertyNode)
  // @Watch监听器的解析结果
  const decoratorObj = findDecoratorByName('Prop', propertyNode.decorators)

  propertyNode.accessibility = 'public'
  if (decoratorObj && decoratorObj.index > -1) {
    // 这是@Prop， 要放到props里
    // 属性名称
    const propertyName = getClassMethodName(propertyNode, $)

    // 解析出vue3里的类型，如下方的【Array】这个字符串
    // type: Array as PropType<{ path: string; name: string }[]>,。
    const valueTypeObj = convertTsTypeToVue3String(propertyNode, $)
    // 正则解析后的结果
    const valueParsed = parseTsAsPropType(propertyNode, $)
    const valueAsPropType = valueParsed.asPropType
    let tmpCode
    // 基础类型，不需要as PropType<>。
    // ，加上换行，防止注释产生问题
    const asPropTypeCode = valueTypeObj.isBasic ? '' : ` as PropType<${ valueAsPropType }
    >`

    // 找到@Prop({})的第一个入参，为了取出default
    const firArgOfProp = decoratorObj.decorator.expression.arguments?.[0]
    if (firArgOfProp) {
      // 把@Prop的注释保留在 第一个入参上
      copyCommentsFromAToB(decoratorObj.decorator, firArgOfProp)
      const firArgOfPropAst = $(firArgOfProp)
      // 把trailingComments和leadingComments合并填充
      // if (!firArgOfProp.comments) {
      mergeTrailingAndLeadingComments(firArgOfProp)
      mergeTrailingAndLeadingCommentsArr(firArgOfPropAst.attr('properties'))
      // }
      // 添加type属性，准备好对象
      firArgOfPropAst.append('properties', `type: ${ valueTypeObj.func }${ asPropTypeCode }`)

      // 先插入一个位符
      pushToContentArr(propertyName, vmContent.propsNames)
      propsAst.append('properties', propertyName + ': {}')
      const propsAstPropsNode = propsAst.attr('properties')
      // 找到最后一个node，也就是刚插入的
      const newestNode = propsAstPropsNode[propsAstPropsNode.length - 1]
      // 替换body
      newestNode.body = firArgOfPropAst[0].nodePath.node

      // 添加上注释
      copyCommentsFromAToB(propertyNode, newestNode)
      // newestNode.trailingComments = propertyNodeAst.attr('trailingComments') || []
      // newestNode.leadingComments = propertyNodeAst.attr('leadingComments') || []
      // newestNode.comments = propertyNodeAst.attr('comments') || []
      // copyCommentsFromAToB(firArgOfProp, newestNode)
    } else {
      // 如果没有入参，则需要自己造
      // tmpCode = `${ propertyName }: {
      //   type: ${ valueTypeObj.func }${ asPropTypeCode }
      // }`
      tmpCode = `${ propertyName }: {
      }`
      // 对于 @Prop() public type!: string 类型的，插入 type: { type: String} 时，会报错，估计是因为都叫type触发了bug，
      // 所以先插入一个空对象，然后再替换，
      pushToContentArr(propertyName, vmContent.propsNames)
      propsAst.append('properties', tmpCode)
      const propsAstPropsNode = propsAst.attr('properties')
      // 找到最后一个node，也就是刚插入的
      const newestNode = propsAstPropsNode[propsAstPropsNode.length - 1]

      const replacedNode = $(`{
        type: ${ valueTypeObj.func }${ asPropTypeCode }
      }`, { isProgram: false })
      // 替换body
      newestNode.body = replacedNode.node

      // 添加上注释
      copyCommentsFromAToB(propertyNode, newestNode)
    }
  } else {
    // 这是普通的属性，放到state里。
    // 属性方法也会当做属性，方便进行重新赋值。public axx = () => {return 1}
    const stateAst = defineComponentAst.find('const state = reactive($_$0)')
    const stateObj = stateAst.match[0]?.[0]?.node
    if (stateObj) {
      const stateObjAst = $(stateObj)
      // 属性名称
      const propertyName = getClassMethodName(propertyNode, $)
      mergeTrailingAndLeadingComments(propertyNode.value)
      // 正则解析后的结果
      const valueParsed = parseClassPropertyAsType(propertyNode, $)
      const valueAsPropType = valueParsed.valueAsType
      let tmpCode
      // 找到@Prop({})的第一个入参，为了取出default
      // 如果没有入参，则需要自己造。加入换行，防止注释出问题
      tmpCode = `${ propertyName }: ${ valueAsPropType }`
      pushToContentArr(propertyName, vmContent.stateDataNames)
      // 替换html里面的字段xxx为state.xxx
      replaceStateDataInHtml(propertyName, astOrg, api)
      stateObjAst.append('properties', tmpCode)
      const stateObjAstPropsNode = stateObjAst.attr('properties')
      // 找到最后一个node，也就是刚插入的
      const newestNode = stateObjAstPropsNode[stateObjAstPropsNode.length - 1]
      // 添加上注释
      copyCommentsFromAToB(propertyNode, newestNode)
    }
  }
}

// 用state里的字段替换html里的对应字段
export function replaceStateDataInHtml(propertyName: string, astOrg, api: { gogocode: any }) {
  const $ = api.gogocode

  const templateAst = astOrg.find('<template></template>')
  if (templateAst.length !== 0) {
    // 字段前可能有 - 表示减号，所以正则里不能包括 -
    const reg = new RegExp('(^|[^a-zA-Z0-9_\\$\'"])' + propertyName + '($|[^a-zA-Z0-9_\\$\'"])', 'g')
    templateAst.find('<$_$>').each(function (ast) {
      const attrs = ast.attr('content.attributes') || []
      attrs.forEach((attr) => {
        if (!attr.value || !attr.value.content) {
          return
        }
        // 如果key里不带冒号，且不带v-model，那就表示是字符串而不是字段，也就没必要替换
        // if (!attr.key || (attr.key.content.indexOf('v-model') === -1 && attr.key.content.indexOf('v-bind') === -1 &&
        //   attr.key.content.indexOf(':') === -1)) {
        //   return
        // }
        const value = attr.value.content
        // 插入state.字符串
        attr.value.content = value.replace(reg, '$1state.' + propertyName + '$2')
      })
    })
  }
}

// 转换@Component里的components到vue3里
export function transComponents(astOrg, api: { gogocode: any }, options: {
  defineComponentAst: any;
}, state: { vmContent: vmContentType }) {
  const defineComponentAst = options.defineComponentAst
  const $ = api.gogocode

  const script = findScriptAst(astOrg)
  const classMatch = script.find('class $_$0 { $$$1 }')
  // vud3里注释是挂在export default语法上，而装饰器是挂在class上。
  // 找到@Component装饰器
  const cDecratorVue2Obj = findDecoratorByName('Component', classMatch.attr('decorators'))
  // 替换components
  if (cDecratorVue2Obj && cDecratorVue2Obj.index > -1) {
    // 取出第一个入参即可, {components: {xxx}}
    const firstArg = cDecratorVue2Obj.decorator.expression.arguments?.[0]

    // @Components({xxx})非空
    if (babelTypes.isObjectExpression(firstArg) && Array.isArray(firstArg.properties) &&
      firstArg.properties.length) {
      const defineAst = defineComponentAst.find('defineComponent()')
      // defineComponent()的入参，也就是vue3的大对象
      const firstArgOfDefine = defineAst.attr('arguments')?.[0]
      const firstArgOfDefineAst = $(firstArgOfDefine)
      const firstArgAst = $(firstArg)
      const firstArgProps = firstArgAst.attr('properties')

      // 其中的components属性
      const componentsProp = findPropertyByName('components', firstArgProps)?.property
      // 把trailingComments和leadingComments拷贝到第一个属性上
      // 把@Component的注释，添加到components属性上
      copyCommentsFromAToB(cDecratorVue2Obj.decorator, componentsProp)
      // 把整体对象的注释，添加到components属性上
      copyCommentsFromAToB(firstArg, componentsProp)
      // 合并trailingComment和leadingComments到comments
      // mergeTrailingAndLeadingCommentsArr(firstArgProps)

      // 合并components对象的每条属性的trailingComment和leadingComments到每条属性的comments
      mergeTrailingAndLeadingCommentsArr(componentsProp?.value?.properties)
      // 需要倒序插入的属性
      const arrInverse = []
      // 先正序一条条的在vue3里插入
      for (let i = 0, il = firstArgProps.length; i < il; i++) {
        if (isVueRouterHook(firstArgProps[i], $)) {
          transVueRouterFuns(firstArgProps[i], api, options, state)
        } else {
          // 倒序的先存储起来
          arrInverse.push(firstArgProps[i])
        }
      }
      // 再倒序一条条的在vue3里插入
      for (let i = arrInverse.length - 1; i >= 0; i--) {
        firstArgOfDefineAst.prepend('properties', arrInverse[i])
        mergeTrailingAndLeadingComments(arrInverse[i])
      }
      // 开始在vue3里插入components
      // if (componentsProp) {
      //   // 合并components对象的每条属性的trailingComment和leadingComments到每条属性的comments
      //   mergeTrailingAndLeadingCommentsArr(componentsProp?.value?.properties)
      //   // 开始在vue3里插入components，先插入一个位符
      //   firstArgOfDefineAst.prepend('properties', componentsProp)
      // }
      // 然后在插入name
      // const nameProp = findPropertyByName('name', firstArgProps)?.property
      // if (nameProp) {
      //   firstArgOfDefineAst.prepend('properties', nameProp)
      // }
      // 添加上注释
      // copyCommentsFromAToB(propertyNode, newestNode)
    }
  }
}

// 转换vueRouter的钩子函数
export function transVueRouterFuns(propertyNode: ObjectProperty | ObjectMethod, api: { gogocode: any }, options: {
  defineComponentAst: any;
}, state: { vmContent: vmContentType }) {
  const $ = api.gogocode
  if (!isVueRouterHook(propertyNode, $)) {
    return
  }

  const propName = getClassMethodName(propertyNode, $)
  const hookName = 'on' + capitalizeFirstLetter(propName)
  const defineComponentAst = options.defineComponentAst
  const setupAst = defineComponentAst.find('setup($_$0) {$$$1}')

  let newCode
  let arrowFuncStr
  if (babelTypes.isObjectMethod(propertyNode)) {
    // 如果是方法
    arrowFuncStr = transObjectPropertyToArrowFunc(propertyNode, $)
    // 加上换行，防止注释产生问题
    newCode = `${hookName}(
      ${arrowFuncStr}
    )`
  } else if (babelTypes.isObjectProperty(propertyNode)) {
    // 如果是属性
    // 拷贝property整体的注释
    copyCommentsFromAToB(propertyNode, propertyNode.value,)
    mergeTrailingAndLeadingComments(propertyNode.value,)
    // 生成字符串
    arrowFuncStr = $(propertyNode.value, { isProgram: false }).generate()
    newCode = `${hookName}(
      ${arrowFuncStr}
    )`
  }
  if (newCode) {
    newCode = '\n' + newCode + '\n'
    setupAst.append('body', newCode)
  }
}

// 转换vue2 class里的属性和方法到vue3
export function transClassMethodsAndProp(astOrg, api: { gogocode: any }, options: {
  defineComponentAst: any;
}, state: { vmContent: vmContentType }) {
  const defineComponentAst = options.defineComponentAst
  const $ = api.gogocode

  const script = findScriptAst(astOrg)
  const setupAst = defineComponentAst.find('setup($_$0) {$$$1}')
  const classMatch = script.find('class $_$0 { $$$1 }')
  const classProperties = classMatch.match['$$$1']

  const vmContent = state.vmContent

  let tmpNode
  let tmpMethodName
  // 转换vue2 class里的计算属性进行分类
  classifyClassComputed(astOrg, api, options, state)
  // 对class的属性和方法进行转换。
  for (let i = 0, il = classProperties.length; i < il; i++) {
    tmpNode = classProperties[i]
    if (babelTypes.isClassMethod(classProperties[i])) {
      tmpMethodName = getClassMethodName(tmpNode, $)
      // 转换class的get和set为计算属性
      if (isGetOrSetMethod(tmpNode)) {
        // 转换vue2 class里的计算属性到vue3
        transClassComputed(classProperties[i], astOrg, api, options, state)
      } else if (isWatchMethod(classProperties[i])) {
        // @Watch监听器的解析结果
        // 转换vue2 class里的@Watch到vue3
        transClassWatchDecorator(classProperties[i], astOrg, api, options, state)
      } else if (isEmitMethod(classProperties[i])) {
        // @Emit的解析结果
        // 转换vue2 class里的@Emit到vue3
        transClassEmitDecorator(classProperties[i], astOrg, api, options, state)
      } else if (isVue2Hooks(tmpMethodName)) {
        // 生命周期钩子
        // 转换vue2 class里的@Emit到vue3
        transClassHooks(classProperties[i], astOrg, api, options, state)
      } else {
        // 转换vue2 class里的基本方法到vue3
        transClassPlainMethods(classProperties[i], astOrg, api, options, state)
      }
    } else if (babelTypes.isClassProperty(classProperties[i])) {
      transClassProperties(classProperties[i], astOrg, api, options, state)
    }
  }

  // 为了链式调用。返回原始ast
  return astOrg
}

// 转换vue2 class里的计算属性进行分类，方便后续转换
export function classifyClassComputed(astOrg, api: { gogocode: any }, options: {
  defineComponentAst: any;
}, state: { vmContent: vmContentType }) {
  const $ = api.gogocode

  const script = findScriptAst(astOrg)
  // const setupAst = defineComponentAst.find('setup($_$0) {$$$1}')
  const classMatch = script.find('class $_$0 { $$$1 }')
  const classProperties = classMatch.match['$$$1']

  const vmContent = state.vmContent

  let tmpNode
  let tmpMethodName
  let tmpComputedFunItem: ComputedFunItem
  let tmpComputedFunKey: string
  // 对class的属性和方法进行分类。
  for (let i = 0, il = classProperties.length; i < il; i++) {
    tmpNode = classProperties[i]
    if (babelTypes.isClassMethod(tmpNode)) {
      tmpMethodName = getClassMethodName(tmpNode, $)
      // 对计算属性进行分类
      if (isGetOrSetMethod(tmpNode)) {
        tmpComputedFunItem = findComputedFunByName(vmContent.computedFun, tmpMethodName)
        tmpComputedFunKey = genComputedFunKey(tmpNode.kind)
        if (tmpComputedFunItem) {
          // 能找到就赋值
          tmpComputedFunItem[tmpComputedFunKey] = tmpNode
        } else {
          // 找不到就新建
          vmContent.computedFun.push({
            [tmpComputedFunKey]: tmpNode,
            name: tmpMethodName
          })
          pushToContentArr(tmpMethodName, vmContent.setupReturnContent)
        }
      }
    }
  }
}

// 转换vue2 class里的计算属性到vue3
export function transClassComputed(propertyNode: ClassMethod, astOrg, api: { gogocode: any }, options: {
  defineComponentAst: any;
}, state: { vmContent: vmContentType }) {
  const defineComponentAst = options.defineComponentAst
  const $ = api.gogocode
  const setupAst = defineComponentAst.find('setup($_$0) {$$$1}')
  const vmContent = state.vmContent

  const tmpNode = propertyNode
  const tmpMethodName = getClassMethodName(tmpNode, $)
  let tmpCode
  let tmpComputedFunItem
  let tmpComputedFunKey: string

  tmpComputedFunItem = findComputedFunByName(vmContent.computedFun, tmpMethodName)
  if (tmpComputedFunItem.hasToVue3 || !tmpComputedFunItem.getNode) {
    // 比如对于同时含有get和set的计算属性，在get时已经把set也处理了，所以再遇到set就可以直接跳过。
    return
  }
  // tmpComputedFunKey = genComputedFunKey(tmpNode.kind);
  if (tmpComputedFunItem.getNode && tmpComputedFunItem.setNode) {
    // get和set同时存在
    // 生成的计算属性的code类似于如下
    // const dialogVisible = computed({
    //   get:
    //   // 测试1
    //     () => {
    //     return props.visible
    //   }
    //   // 测试2
    //   ,set:
    //   // 测试3
    //     (val: any) => {
    //     emit('update:visible', val)
    //   }
    //   // 测试4
    // })
    // 前后分别加换行，是防止有注释，导致调整后的代码出问题
    tmpCode = 'const ' + tmpComputedFunItem.name + ' = computed({\nget:\n' +
      transGetOrSetFuncToArrowFunc(tmpComputedFunItem.getNode, $) + '\n,set:\n' +
      transGetOrSetFuncToArrowFunc(tmpComputedFunItem.setNode, $) + '\n})'
    tmpComputedFunItem.hasToVue3 = true
    setupAst.append('body', '\n' + tmpCode + '\n')
    // setupAst.append('body', tmpVue3Ast)
  } else if (tmpComputedFunItem.getNode) {
    // 只有get存在
    // 前后分别加换行，是防止有注释，导致调整后的代码出问题
    tmpCode = 'const ' + tmpComputedFunItem.name + ' = computed(\n' +
      transGetOrSetFuncToArrowFunc(tmpComputedFunItem.getNode, $) + '\n)'
    tmpComputedFunItem.hasToVue3 = true
    setupAst.append('body', '\n' + tmpCode + '\n')
    // setupAst.append('body', tmpVue3Ast)
  }
}

// 转换vue2 class里的@Watch到vue3
export function transClassWatchDecorator(propertyNode: ClassMethod, astOrg, api: { gogocode: any }, options: {
  defineComponentAst: any;
}, state: { vmContent: vmContentType }) {
  const defineComponentAst = options.defineComponentAst
  const $ = api.gogocode
  const setupAst = defineComponentAst.find('setup($_$0) {$$$1}')
  const vmContent = state.vmContent

  const tmpMethodName = getClassMethodName(propertyNode, $)
  let tmpCode

  // @Watch监听器的解析结果
  const decoratorObj = findDecoratorByName('Watch', propertyNode.decorators)
  // 监听的属性名字
  const propPath = decoratorObj?.decorator?.expression?.arguments?.[0]?.value || ''

  // 监听的选项，如{ immediate: true, deep: true }
  let optionsStr = ''
  if (decoratorObj.decorator.expression?.arguments?.[1]) {
    optionsStr = $(decoratorObj.decorator.expression?.arguments?.[1]).generate()
  }

  // 移除@Watch注解
  removeDecoratorByName('Watch', propertyNode.decorators)
  // 监听的实际函数，转为箭头函数
  tmpCode = transClassMethodToArrowFunc(propertyNode, $)

  pushToContentArr(tmpMethodName, vmContent.watchFunNames)
  // 多加些换行，为了防止注释造成代码错误
  tmpCode = `watch(() => ${ propPath },
    ${ tmpCode }
    , ${ optionsStr })`

  const newCodeAst = $('\n' + tmpCode + '\n')
  // 找到新函数的ast，
  const watchfuncAst = newCodeAst.find('watch()')
  const watchfuncAstNode = newCodeAst.find('watch()')[0].nodePath.node
  // 把@Prop的注释保留在 函数上
  copyCommentsFromAToB(decoratorObj.decorator, watchfuncAstNode)
  mergeTrailingAndLeadingComments(watchfuncAstNode)
  setupAst.append('body', newCodeAst)
}

// 转换vue2 class里的@Emit到vue3
export function transClassEmitDecorator(propertyNode: ClassMethod, astOrg, api: { gogocode: any }, options: {
  defineComponentAst: any;
}, state: { vmContent: vmContentType }) {
  const defineComponentAst = options.defineComponentAst
  const $ = api.gogocode
  const setupAst = defineComponentAst.find('setup($_$0) {$$$1}')
  const vmContent = state.vmContent
  const tmpMethodName = getClassMethodName(propertyNode, $)
  let tmpCode

  // @Emit的解析结果
  const decoratorObj = findDecoratorByName('Emit', propertyNode.decorators)

  // 监听的属性名字。考虑到@Emit(`confirm`)模版字符串，generate会生成原始的`confirm`作为字符串
  let propPath = $(decoratorObj?.decorator?.expression?.arguments?.[0]).generate()
  propPath = replaceSpecialEmits(propPath)
  // 移除@Emit注解
  removeDecoratorByName('Emit', propertyNode.decorators)
  tmpCode = transClassMethodToFunc(propertyNode, $)
  const newCodeAst = $('\n' + tmpCode + '\n')
  // 找到新函数的ast，接下来要往函数内插入数据
  const functionAst = newCodeAst.find((propertyNode.async ? 'async ' : '') + 'function '
    + tmpMethodName + '() {}')
  // 找到return语句
  const hasReturn = newCodeAst.find('return $$$')

  // 函数的参数名字列表
  const paramsNameList = getArgumentsStrFromFuncAst(functionAst)
  // 拼接成字符串
  const paramsStr = Array.isArray(paramsNameList) && paramsNameList.length ?
    (', ' + paramsNameList.join(', ')) : ''
  if (hasReturn && hasReturn.length) {
    // 如果有return语句，则直接删除return关键字
    let returnValue = hasReturn.generate().replace(/(\n\s*|^\s*)\breturn\b/, '')
    if (returnValue) {
      // 加上换行，防止有注释导致错误
      returnValue = ',\n' + returnValue + '\n'
    }

    const emitAst = $('emit(' + propPath + returnValue + paramsStr + ')')
    // 把@Emit的注释保留在 emit(xxx)语句上。不能@Emit的注释merge到整个函数上，否者append('body'时会报错，
    // 不知道是因为删掉@Emit注解后字符的位置loc对不上了，
    // 还是因为transClassMethodToFunc里擅自加上public导致字符位置loc对不上了
    copyEmitDecoratorCommentsToEmitLine(decoratorObj.decorator, emitAst)
    // 在return前插入emit语句
    hasReturn.before(emitAst)
  } else {
    // 如果没有return语句
    const emitAst = $('emit(' + propPath + paramsStr + ')')
    // 把@Emit的注释保留在 emit(xxx)语句上
    copyEmitDecoratorCommentsToEmitLine(decoratorObj.decorator, emitAst)

    // 在setup函数的body最后插入emit语句
    functionAst.append('body', emitAst)
  }
  pushToContentArr(propPath, vmContent.emitsTypes)
  // 要把emit函数也推入methodsFunNames，因为需要全局替换emit函数，比如：this.emitRefresh
  pushToContentArr(tmpMethodName, vmContent.methodsFunNames)
  pushToContentArr(tmpMethodName, vmContent.setupReturnContent)
  setupAst.append('body', newCodeAst)
}

// 把@Emit的注释保留在 emit(xxx)语句上
export function copyEmitDecoratorCommentsToEmitLine(decoratorNode: any, emitAst: any) {
  const emitLineNode = emitAst.find('emit()')[0].nodePath.node
  // 把@Emit的注释保留在 emit(xxx)语句上
  copyCommentsFromAToB(decoratorNode, emitLineNode)
  mergeTrailingAndLeadingComments(emitLineNode)
}

// 转换vue2 class里的声明周期钩子到vue3
export function transClassHooks(propertyNode: ClassMethod, astOrg, api: { gogocode: any }, options: {
  defineComponentAst: any;
}, state: { vmContent: vmContentType }) {
  const defineComponentAst = options.defineComponentAst
  const $ = api.gogocode
  const setupAst = defineComponentAst.find('setup($_$0) {$$$1}')
  const vmContent = state.vmContent
  let tmpMethodName = getClassMethodName(propertyNode, $)
  let tmpCode

  // 生命周期钩子
  if (['beforeCreate', 'created'].includes(tmpMethodName)) {
    // vue3里被删掉的生命周期钩子，
    // vue3没有created，所以加上前缀，改为特殊函数名。initCreated
    tmpMethodName = `init${ tmpMethodName.substring(0, 1).toUpperCase() }${ tmpMethodName.substring(1) }`;
    // 更改节点里的函数名，方便接下来用新函数名生成新函数。
    (propertyNode.key as Identifier).name = tmpMethodName
    tmpCode = transClassMethodToFunc(propertyNode, $)

    // 这里的执行要等到return之前，所以放入initExpressions先存起来。
    pushToContentArr(tmpMethodName + '()', vmContent.initExpressions)

    setupAst.append('body', '\n' + tmpCode + '\n')
  } else if (v3HooksNameDist[tmpMethodName]) {
    const hookName = v3HooksNameDist[tmpMethodName]
    // 生命周期的实际函数，转为箭头函数
    tmpCode = transClassMethodToArrowFunc(propertyNode, $)
    // 加入换行，防止注释产生问题。
    tmpCode = `${ hookName }(
      ${ tmpCode }
    )`

    setupAst.append('body', '\n' + tmpCode + '\n')
  }
}

// 转换vue2 class里的基本方法到vue3
export function transClassPlainMethods(propertyNode: ClassMethod, astOrg, api: { gogocode: any }, options: {
  defineComponentAst: any;
}, state: { vmContent: vmContentType }) {
  const defineComponentAst = options.defineComponentAst
  const $ = api.gogocode
  const setupAst = defineComponentAst.find('setup($_$0) {$$$1}')
  const vmContent = state.vmContent
  let tmpMethodName = getClassMethodName(propertyNode, $)
  let tmpCode

  pushToContentArr(tmpMethodName, vmContent.methodsFunNames)
  pushToContentArr(tmpMethodName, vmContent.setupReturnContent)
  // vmContent.setupReturnContent.push(tmpMethodName)
  tmpCode = transClassMethodToFunc(propertyNode, $)
  setupAst.append('body', '\n' + tmpCode + '\n')
}

// 最后，向setup插入return语句，并在return之前，插入需要执行的表达式语句。
// 插入emits语句
export function appendReturnToSetup(astOrg, { gogocode: $ }, { defineComponentAst }, state: {
  vmContent: vmContentType
}) {
  const setupAst = defineComponentAst.find('setup($_$0) {$$$1}')
  const vmContent = state.vmContent
  if (vmContent.initExpressions.length) {
    // 插入需要执行的表达式语句
    setupAst.append('body', '\n' + vmContent.initExpressions.join('\n') + '\n')
  }

  // 统一插入emits语句。找到一个emit插入一个到ast里的话，就要到ast里去重，比较麻烦。
  const emitsPropAst = defineComponentAst.find('emits: $_$0')
  const emitsArrAst = $(emitsPropAst.match[0][0].node)
  for (let i = 0, il = vmContent.emitsTypes.length; i < il; i++) {
    emitsArrAst.append('elements', vmContent.emitsTypes[i])
  }

  // 生成return语句
  let returnExpress = vmContent.setupReturnContent.join(',\n')
  // 加入换行，防止注释产生问题。
  returnExpress = `return {
    ${ returnExpress }
  }`
  // 插入return语句
  setupAst.append('body', '\n' + returnExpress)
}
