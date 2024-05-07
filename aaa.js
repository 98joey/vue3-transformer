const { transform, myTransform } = require("./index");
const transformVue = require('./utils/transform.ts').default
const gogocode = require("gogocode");
console.log("gogoCode:", gogocode);
const fs = require("fs");

// 最终生成的defineComponent的模拟文件。不能有components。
const defineComponentSample = `defineComponent({
    props: {
    },
    emits: [
    ],
    setup(props, ctx) {
      const emit = ctx.emit
      const { t } = useI18n()
      const route = useRoute()
      const router = useRouter()
      const state = reactive({
      })
    }
  })`

const file = fs.readFileSync("./index.vue").toString();
// console.log('file', file)
const codeAst = gogocode(file, { parseOptions: { language: "vue" } });

const res = transformVue({source: file, path: './index.vue'}, { gogocode }, { defineComponentSample });

console.log("res", res);

// const oRes = transform({ path: "./index.vue", source: file }, { gogocode }, {});

// console.log("ores", oRes);
