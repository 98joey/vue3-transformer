import { vmContentType } from './types'
import { pushToContentArr } from './commonUtils'

class EmitSet {
  constructor(arr: string[]) {
    this.set = arr || []
  }

  public set = []

  public fillEmitSet(ast) {
    const emitArrAst = ast.find(['$emit($_$,$$$)', '$_$1.$emit($_$,$$$)', '$emit($_$)', '$_$1.$emit($_$)'])
    emitArrAst.each((fAst) => {
      if (fAst.match && fAst.match[0] && fAst.match[0].length) {
        let key = fAst.match[0][0].raw
        key = replaceSpecialEmits(key)
        pushToContentArr(key, this.set)
      }
    })
  }

  public getSet() {
    return this.set
  }
}

// 替换一些特殊的emit类型
export function replaceSpecialEmits(str: string) {
  if (str === `'input'` || str === `"input"` || str === '`input`' || str === 'input') {
    //https://v3.cn.vuejs.org/guide/migration/v-model.html#%E8%BF%81%E7%A7%BB%E7%AD%96%E7%95%A5
    str = '\'update:modelValue\''
  }
  return str
}

export function collectEmitsTypes(astOrg, api: { gogocode: any }, options: {
  defineComponentAst: any;
}, state: { vmContent: vmContentType }) {
  // 迁移指南: https://v3.cn.vuejs.org/guide/migration/emits-option.html#overview
  const $ = api.gogocode
  let emitSet = new EmitSet(state.vmContent.emitsTypes)
  const templateAst = astOrg.find('<template></template>')
  if (templateAst.length !== 0) {
    templateAst.find('<$_$>').each(function (ast) {
      const attrs = ast.attr('content.attributes') || []
      attrs.forEach((attr) => {
        if (!attr.value || !attr.value.content) {
          return
        }
        const value = attr.value.content
        // 如果属性值里包含$emit
        if (value.indexOf('$emit') > -1) {
          const emitAst = $(value)
          emitSet.fillEmitSet(emitAst)
        }
      })
    })
  }

  const scriptAST = astOrg.parseOptions && astOrg.parseOptions.language === 'vue'
    ? astOrg.find('<script></script>')
    : astOrg

  if (scriptAST.length !== 0) {
    emitSet.fillEmitSet(scriptAST)
    // if (emitSet.getSet().length === 0) {
    //   emitSet = null
    //   return astOrg
    // }
    // appendEmitsProp(scriptAST, emitSet.getSet())
    emitSet = null
  }
}

// 替换vue2 class和<template>里的$emit
export function replaceVue2Emit(sourceCode: string, api: { gogocode: any }, options: {
  defineComponentAst: any;
}, state: { vmContent: vmContentType }) {
  if (typeof sourceCode !== 'string') {
    return
  }
  let newCode = sourceCode.replace(/\bthis\.\$emit\b/g, 'emit')
  newCode = newCode.replace(/(^|[^a-zA-Z0-9-_\$])\$emit\b/g, (match, p1) => {
    return p1 + 'emit'
  })
  return newCode
}
