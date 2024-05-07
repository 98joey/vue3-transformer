import {
    ClassMethod,
    ClassProperty,
    Decorator,
    Identifier,
    LabeledStatement,
    ObjectExpression, ObjectMethod, ObjectProperty,
    TSTypeAnnotation, TSUnionType
  } from '@babel/types'
  import * as babelTypes from '@babel/types'
  import { ComputedFunItem } from './types'
  import { copyCommentsFromAToB, mergeTrailingAndLeadingComments } from './commonUtils'
  
  // 从源ast里找到script标签。
  export function findScriptAst(sourceAst: any) {
    const scriptAST = sourceAst && sourceAst.parseOptions && sourceAst.parseOptions.language === 'vue'
      ? sourceAst.find('<script></script>')
      // 如果不是vue，则认为自身就是js代码，不含html
      : sourceAst
    return scriptAST
  }
  
  // 从对象的各个字段里，找到指定name的字段
  export function findPropertyByName<T = ClassMethod | ClassProperty | LabeledStatement>(
    name: string, propArr: T[], $?: any) {
    if (!(Array.isArray(propArr) && propArr.length && name)) {
      return
    }
    let tmp
    for (let i = 0, il = propArr.length; i < il; i++) {
      tmp = propArr[i]
      if (getClassMethodName(tmp, $) === name) {
        return {
          property: tmp,
          index: i
        }
      }
    }
  }
  
  // 获取class里方法或者属性的名字
  export function getClassMethodName(
    node: ClassMethod | ClassProperty | LabeledStatement | ObjectProperty | ObjectMethod, $?: any) {
    if (!(node)) {
      return ''
    }
    if (babelTypes.isLabeledStatement(node)) {
      if (babelTypes.isIdentifier(node.label)) {
        return node.label.name
      } else if ($) {
        return '[' + $(node.label).generate() + ']'
      }
    } else {
      if (babelTypes.isIdentifier(node.key)) {
        return node.key.name
      } else if ($) {
        return '[' + $(node.key).generate() + ']'
      }
    }
    return ''
  }
  
  // 是get方法 public get abc() {}
  export function isGetMethod(node?: ClassMethod) {
    return node && node.kind === 'get'
  }
  
  // 是set方法 public set abc() {}
  export function isSetMethod(node?: ClassMethod) {
    return node && node.kind === 'set'
  }
  
  export function isGetOrSetMethod(node?: ClassMethod) {
    return isGetMethod(node) || isSetMethod(node)
  }
  
  // 从vmContent.computedFun里找到指定的对象
  export function findComputedFunByName(computedFun: ComputedFunItem[], name?: string) {
    if (!name || !Array.isArray(computedFun)) {
      return
    }
    for (let i = 0, il = computedFun.length; i < il; i++) {
      if (computedFun[i].name === name) {
        return computedFun[i]
      }
    }
  }
  
  // 根据注解的名字找到注解
  // @name，注解的名字，比如Watch，Emit
  export function findDecoratorByName(name: string, decorators: Decorator[]) {
    if (!(Array.isArray(decorators) && decorators.length && name)) {
      return
    }
    let tmpDecrator
    for (let i = 0, il = decorators.length; i < il; i++) {
      tmpDecrator = decorators[i]
      if (tmpDecrator.expression && tmpDecrator.expression.callee &&
        tmpDecrator.expression.callee.name === name) {
        return {
          decorator: tmpDecrator,
          index: i
        }
      }
    }
  }
  
  // 根据注解的名字，从数组里移除指定的注解
  // @name，注解的名字，比如Watch，Emit
  export function removeDecoratorByName(name: string, decorators: Decorator[]) {
    const findObj = findDecoratorByName(name, decorators)
    if (findObj && findObj.index > -1) {
      decorators.splice(findObj.index, 1)
    }
  }
  
  // 某个class的方法是否是@Watch，也就是有监听器。
  export function isWatchMethod(node?: ClassMethod) {
    if (!node) {
      return
    }
    const decrator = findDecoratorByName('Watch', node.decorators)
    return decrator && decrator.index > -1
  }
  
  // 某个class的方法是否是@Watch，也就是有监听器。
  export function isEmitMethod(node?: ClassMethod) {
    if (!node) {
      return
    }
    const decrator = findDecoratorByName('Emit', node.decorators)
    return decrator && decrator.index > -1
  }
  
  // 用正则替换的方式把class的get或者set函数，转为箭头函数字符串
  export function transGetOrSetFuncToArrowFuncByReg(node: ClassMethod, $: any) {
    if (!node || !$) {
      return ''
    }
    // 全部改为public，方便下方替换
    node.accessibility = 'public'
    const tmpAst = $(node)
    // 变为string，再插入，这样可以把注释也带入到新代码里。
    let tmpCode = tmpAst.generate()
    // 把get函数替换为箭头函数。也可以简单些，替换为function函数。
    tmpCode = tmpCode.replace(/(\n\s*|^\s*)((public|private|protected)\s+(?:get|set)\s+)[^<(]+([^{]+)\{/i, '$1$4=> {')
  
    return tmpCode
  }
  
  // 把class的get或者set函数，转为箭头函数字符串
  export function transGetOrSetFuncToArrowFunc(node: ClassMethod, $: any) {
    return transObjectPropertyToArrowFunc(node, $)
    // return transGetOrSetFuncToArrowFuncByReg(node, $)
  }
  
  // 用正则替换的方式把class的方法函数，转为箭头函数字符串，
  export function transClassMethodToArrowFuncByReg(node: ClassMethod, $: any) {
    if (!node || !$) {
      return ''
    }
    // 全部改为public，方便下方替换
    node.accessibility = 'public'
    const tmpAst = $(node)
    // 变为string，再插入，这样可以把注释也带入到新代码里。
    let tmpCode = tmpAst.generate()
    // 把get函数替换为箭头函数。也可以简单些，替换为function函数。
    tmpCode = tmpCode.replace(/(\n\s*|^\s*)((public|private|protected)\s+(async\s+)?)[^<(]+([^{]+)\{/i, '$1$4$5=> {')
  
    return tmpCode
  }
  
  // 把class的方法函数，转为箭头函数字符串
  export function transClassMethodToArrowFunc(node: ClassMethod, $: any) {
    return transObjectPropertyToArrowFunc(node, $)
    // return transClassMethodToArrowFuncByReg(node, $)
  }
  
  // 把class的方法函数，转为箭头函数字符串
  export function transObjectPropertyToArrowFunc(node: ObjectMethod | ClassMethod, $: any) {
    if (!node || !$) {
      return ''
    }
    // 创建新的箭头函数
    const newArrowFuncBody = (node.async ? 'async ' : '') + '() => {}'
    const newArrowFuncAst = $(newArrowFuncBody, { isProgram: false })
    // const newArrow2 = babelTypes.arrowFunctionExpression(node.params, node.body, node.async, node.returnType, node.typeParameters)
    // 赋值入参
    newArrowFuncAst.node.expression.params = node.params
    // 赋值函数体
    newArrowFuncAst.node.expression.body = node.body
    // 赋值typeParameters
    newArrowFuncAst.node.expression.typeParameters = node.typeParameters
    // 赋值returnType
    newArrowFuncAst.node.expression.returnType = node.returnType
    // copyCommentsFromAToB(node.body, newArrowFuncAst.node.expression)
    // 拷贝函数整体的注释
    copyCommentsFromAToB(node, newArrowFuncAst.node.expression)
    mergeTrailingAndLeadingComments(newArrowFuncAst.node.expression)
    const newCode = $(newArrowFuncAst).generate()
    return newCode
  }
  
  // 利用正则把class的方法函数，转为function函数字符串
  // @newFuncName 新函数名字
  export function transClassMethodToFuncByReg(node: ClassMethod, $: any, newFuncName?: string) {
    if (!node || !$) {
      return ''
    }
    // 全部改为public，方便下方替换
    node.accessibility = 'public'
    const tmpAst = $(node)
    // 变为string，再插入，这样可以把注释也带入到新代码里。
    let tmpCode = tmpAst.generate()
    // 把get函数替换为箭头函数。也可以简单些，替换为function函数。
    tmpCode = tmpCode.replace(/(\n\s*|^\s*)((public|private|protected)\s+)(async\s+)?/i, '$1$4function ')
  
    return tmpCode
  }
  
  // 把class的方法函数，转为function函数字符串
  // @newFuncName 新函数名字
  export function transClassMethodToFunc(node: ClassMethod, $: any, newFuncName?: string) {
    return transClassMethodToFuncByAst(node, $)
    // return transClassMethodToFuncByReg(node, $)
  }
  
  // 领用ast把class的方法函数，转为function函数字符串
  // @newFuncName 新函数名字
  export function transClassMethodToFuncByAst(node: ClassMethod, $: any) {
    if (!node || !$) {
      return ''
    }
    const newFuncAst = $('function dummy() {}', { isProgram: false })
    newFuncAst.node.id = node.key
    newFuncAst.node.params = node.params
    newFuncAst.node.body = node.body
    newFuncAst.node.generator = node.generator
    newFuncAst.node.async = node.async
    newFuncAst.node.returnType = node.returnType
    newFuncAst.node.typeParameters = node.typeParameters
    // 拷贝函数整体的注释
    copyCommentsFromAToB(node, newFuncAst.node)
    mergeTrailingAndLeadingComments(newFuncAst.node)
    const stra = newFuncAst.generate()
    return newFuncAst.generate()
  }
  
  // 获取函数的入参名字列表。其中，【...dto → '...dto'】
  export function getArgumentsStrFromFuncAst(funcAst: any) {
    if (!funcAst) {
      return
    }
    const params = funcAst.attr('params')
    const result = []
    if (Array.isArray(params) && params.length) {
      let tmpNode
      for (let i = 0, il = params.length; i < il; i++) {
        tmpNode = params[i]
        if (babelTypes.isIdentifier(tmpNode)) {
          result.push(tmpNode.name)
        } else if (babelTypes.isRestElement(tmpNode)) {
          result.push('...' + (tmpNode.argument as Identifier).name)
        }
      }
    }
    return result
  }
  
  export const vue2HooksNameArr = ['beforeCreate', 'created', 'beforeMount', 'mounted',
    'beforeUpdate', 'updated', 'beforeDestroy', 'destroyed',
    'activated', 'deactivated', 'errorCaptured']
  
  export function genV3HooksNameDist() {
    // vue2里有的生命周期钩子，和vue3的对照
    const v3HooksNameDist = {
      beforeMount: 'onBeforeMount',
      mounted: 'onMounted',
      beforeUpdate: 'onBeforeUpdate',
      updated: 'onUpdated',
      beforeDestroy: 'onBeforeUnmount',
      destroyed: 'onUnmounted',
      activated: 'onActivated',
      deactivated: 'onDeactivated',
      errorCaptured: 'onErrorCaptured'
    }
    return v3HooksNameDist
  }
  
  // 根据函数名称，是否是vue2的生命周期函数
  export function isVue2Hooks(funcName: string) {
    return vue2HooksNameArr.indexOf(funcName) > -1
  }
  
  // 根据对象里的属性名字找到属性
  export function findObjectPropertyByName(name: string, node: ObjectExpression) {
    if (!(babelTypes.isObjectExpression(node) && Array.isArray(node.properties) &&
      node.properties.length && name)) {
      return
    }
    const propertiesArr = node.properties
    let tmpNode
    for (let i = 0, il = propertiesArr.length; i < il; i++) {
      tmpNode = propertiesArr[i]
      if (babelTypes.isIdentifier(tmpNode.key) && tmpNode.key.name === name) {
        // 找到components属性
        return {
          node: tmpNode,
          index: i
        }
      }
    }
  }
  
  // str里最后一个匹配的 pattern 被替换为 replacement
  export function replaceLastOfStr(pattern: RegExp, replacement: string, str: string) {
    if (!pattern || !str) {
      return str
    }
  
    let oldArr: RegExpExecArray | undefined
    let arr: RegExpExecArray | undefined
    // 找到最后一个匹配项目
    while ((arr = pattern.exec(str)) !== null) {
      oldArr = arr
    }
    if (oldArr) {
      const preStr = str.substring(0, oldArr.index)
      const postStr = str.substring(oldArr.index + oldArr[0].length)
      return preStr + postStr
    } else {
      return str
    }
  }
  
  // 找ts类型
  export function getTsTypeAsStringFromNode(node: ClassProperty) {
    if (!node) {
      return node
    }
    // 要取2层
    const valueType = (node.typeAnnotation as TSTypeAnnotation).typeAnnotation
    return valueType
  }
  
  // 解析出vue3里的构造函数，如下方的【Array】这个字符串
  // type: Array as PropType<{ path: string; name: string }[]>,。
  export function genConstructorByTypeAnnotation(typeAnnotation: any, $?: any) {
    if (babelTypes.isTSArrayType(typeAnnotation)) {
      return 'Array' // Array构造函数
    } else if (babelTypes.isTSNumberKeyword(typeAnnotation)) {
      return 'Number'
    } else if (babelTypes.isTSStringKeyword(typeAnnotation)) {
      return 'String'
    } else if (babelTypes.isTSNullKeyword(typeAnnotation)) {
      return 'null'
    } else if (babelTypes.isTSBooleanKeyword(typeAnnotation)) {
      return 'Boolean'
    } else if (babelTypes.isTSFunctionType(typeAnnotation)) {
      // public curQueryType!: () => {} 箭头函数会是这个类型
      return 'Function'
    } else if (babelTypes.isTSLiteralType(typeAnnotation)) {
      // 字面量
      if (babelTypes.isNumericLiteral(typeAnnotation.literal)) {
        return 'Number'
      } else if (babelTypes.isStringLiteral(typeAnnotation.literal)) {
        return 'String'
      } else if (babelTypes.isNullLiteral(typeAnnotation.literal)) {
        return 'null'
      } else if (babelTypes.isBooleanLiteral(typeAnnotation.literal)) {
        return 'Boolean'
      } else if (babelTypes.isRegExpLiteral(typeAnnotation.literal)) {
        return 'RegExp'
      } else {
        return 'Object'
      }
    } else if (babelTypes.isTSTypeReference(typeAnnotation) &&
      babelTypes.isIdentifier(typeAnnotation.typeName)) {
      // public curQueryType!: Function 会是这个类型。也就是直接写了js里的构造函数。
      // public curQueryType!: Record<xxxx> 也会是这个类型。
      if (typeAnnotation.typeName.name === 'Record') {
        // 如果是Record，就认为是Object
        return 'Object'
      } else {
        return typeAnnotation.typeName.name
      }
    } else if (babelTypes.isTSParenthesizedType(typeAnnotation)) {
      // public curQueryType!: (() => {}) 会是这个类型
      // return 'Function'
      return genConstructorByTypeAnnotation(typeAnnotation.typeAnnotation)
    }
    // 除了基本类型，都是object。。。。
    return 'Object'
  }
  
  // 解析出vue3里的类型，如下方的【Array】这个字符串
  // type: Array as PropType<{ path: string; name: string }[]>,。
  export function genTypeByTypeAnnotation(typeAnnotation: any, $: any) {
    if (babelTypes.isTSUnionType(typeAnnotation)) {
      // 联合类型
      const result = []
      const unionTypeArr = (typeAnnotation as TSUnionType).types
      let tmpType
      for (let i = 0, il = unionTypeArr.length; i < il; i++) {
        tmpType = genConstructorByTypeAnnotation(unionTypeArr[i], $)
        if (result && result.indexOf(tmpType) === -1) {
          result.push(tmpType)
        }
      }
      return { func: '[' + result.join(',') + ']', isBasic: false }
    } else {
      const type = genConstructorByTypeAnnotation(typeAnnotation)
      return {
        func: type,
        isBasic: !(type === 'Array' || type === 'Object' || type === 'Function' || type === 'RegExp')
      }
    }
  }
  
  // 解析出vue3里的类型，如下方的【Array】这个字符串
  // type: Array as PropType<{ path: string; name: string }[]>,。
  export function convertTsTypeToVue3String(node: ClassProperty, $?: any) {
    const typeAnnotation = getTsTypeAsStringFromNode(node)
    return genTypeByTypeAnnotation(typeAnnotation, $)
  }
  
  /**
   * 移除一段文字开始和结尾的连续的comment。如下
   *   // },
   //
   @Prop({ default: () => {
          a+b
          }
        })
   public dictMap: Record<string,
   // ppppp1
   Record<string, any>>
  
   // public a = abc as Record<string, any>
   // pub
   * @param str
   */
  // export function removeCommentOfBeginAndEnd(str?: string) {
  //   if (!str) {
  //     return str
  //   }
  //   const strArr = str.split('\n')
  //   if (Array.isArray(strArr) && strArr.length) {
  //     const newStrArr = []
  //     let preIsAllCommentOrBlan = true
  //     const blankLineReg = /^\s*$/
  //     const commentLineReg = /^\s*\/\/.*$/
  //     for (let i = 0, il = strArr.length; i < il;i++) {
  //       if (strArr[i])
  //     }
  //   }
  //   str = str.replace(/^(\s*)\/\/[^\n]*?(\n|$)/, '')
  // }
  
  export function parseClassPropertyAsType(node: ClassProperty, $: any) {
    if (!node || !$) {
      return
    }
    node.accessibility = 'public'
    const nodeAst = $(node)
    // let tmpCode = nodeAst.generate()
    // let arr: RegExpExecArray | undefined
    // const validLineReg = /(\n\s*|^\s*)(public|private|protected)\s+/
    // arr = validLineReg.exec(tmpCode)
    // if (!(arr && arr.index > -1)) {
    //   // 没有有效的起始行。
    //   return
    // }
    // 忽略开头的注释，找到有效的起始行。
    // tmpCode = tmpCode.substring(arr.index)
  
    // 查找属性的类型声明。
    let propTypeAnnoStr
    // const propTypeAnnoMath = tmpCode.match(/:\s*([^!?:]+?)\s*(=|;|$|\/\/)/);
    // if (propTypeAnnoMath) {
    //   // 这是值类型，也就是上方的 TMPL。as优先，这个备用
    //   propTypeAnnoStr = propTypeAnnoMath[1]
    // }
    // 这是值类型，也就是上方的 TMPL。as优先，这个备用
    propTypeAnnoStr = $(node.typeAnnotation).generate()
    if (propTypeAnnoStr) {
      // 替换掉开头的冒号: 。
      propTypeAnnoStr = propTypeAnnoStr.replace(/((\n|^)\s*):\s*/, '')
    }
  
    let valueTypeStr = 'undefined'
    // 有可能没有 = 号
    // const eqIndex = tmpCode.indexOf('=')
    // // public a: TMPL = abc as Record<string, any>
    // // 这是value和as，也就是上方的 abc as Record<string, any>
    // if (eqIndex > -1) {
    //   // 查找出值 + as语句，为了尽可能保留注释
    //   valueTypeStr = tmpCode.substring(eqIndex + 1);
    // } else {
    //   // 如果没有等号。此时也不会有as语句。
    //   if (node.value === undefined) {
    //     // 如果没有赋值语句
    //     valueTypeStr = 'undefined'
    //   } else if (node.value === null) {
    //     // 如果没有赋值语句，ast里会被解析为null，感觉undefined也许更好？
    //     valueTypeStr = 'undefined'
    //   }
    // }
    // 如果没有等号。此时也不会有as语句。
    if (node.value === undefined) {
      // 如果没有赋值语句
      valueTypeStr = 'undefined'
    } else if (node.value === null) {
      // 如果没有赋值语句，ast里会被解析为null，感觉undefined也许更好？
      valueTypeStr = 'undefined'
    } else {
      valueTypeStr = $(node.value).generate()
    }
    if (babelTypes.isArrowFunctionExpression(node.value) ||
      babelTypes.isFunctionExpression(node.value)) {
      // 值是函数的话需要加上括号，这样后边加as语句时才不会报错。() => {} → (() => {})
      // 加上换行，防止注释产生问题
      valueTypeStr = '(' + valueTypeStr + '\n)'
    }
  
    if (!babelTypes.isTSAsExpression(node.value) && propTypeAnnoStr) {
      // 如果不包含as语句，则采用propTypeAnnoStr作为备选。加上换行，防止注释导致问题
      // if (node.value === undefined) {
        // 如果没有赋值语句
        // valueTypeStr = 'undefined'
      // } else if (node.value === null) {
        // 如果没有赋值语句，ast里会被解析为null，感觉undefined也许更好？
        // valueTypeStr = 'undefined'
      // } else {
      //   debugger
      //   valueTypeStr = $(node.value).generate()
      //   debugger
      // }
      // 拼接，这里忽略了值的注释，因为语法上as必须紧跟着值，中间不能有注释或者换行。
      // 加上换行，防止注释产生问题
      valueTypeStr = valueTypeStr + ' as ' + propTypeAnnoStr
    }
  
    return {
      valueAsType: valueTypeStr, // 包含value和as语句
      valueAnnoStr: propTypeAnnoStr
    }
  }
  
  /**
   * 解析出@Prop()属性的类型声明语句
   *  @Prop()
   public dictMap!: Record<string, Record<string, any>>
   * @param node
   * @param $
   */
  export function parseTsAsPropType(node: ClassProperty, $: any) {
    let propTypeAnnoStr
    // public a!: Record<string, any>
    // 这是值类型，也就是上方的 TMPL。as优先，这个备用
    propTypeAnnoStr = $(node.typeAnnotation).generate()
    if (propTypeAnnoStr) {
      // 替换掉开头的冒号: 。
      propTypeAnnoStr = propTypeAnnoStr.replace(/((\n|^)\s*):\s*/, '')
      return {
        asPropType: propTypeAnnoStr
      }
    }
  }
  
  export function isVueRouterHook(propertyNode: ObjectProperty | ObjectMethod, api: { gogocode: any }) {
    const $ = api.gogocode
    const propName = getClassMethodName(propertyNode, $)
    if (propName === 'beforeRouteUpdate' || propName === 'beforeRouteEnter' || propName === 'beforeRouteLeave') {
      return true
    }
    return false
  }
  