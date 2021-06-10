<!--
 * @Author: ryuusennka
 * @Date: 2021-05-09 00:03:05
 * @LastEditors: ryuusennka
 * @LastEditTime: 2021-05-14 23:22:43
 * @FilePath: /projects/02/BrowserWorkingPrinciple/ notes.md
 * @Description:
-->

# NOTEBOOK

在 HTML 标准中已经规定好了 HTML 的状态，参考 <https://html.spec.whatwg.org/multipage/parsing.html#tokenization>

## HTML 的标签

1. 开始标签
2. 结束标签
3. 自封闭标签

## HTML 的属性

- 属性是分成单引号、双引号和无引号三种写法，因此需要较多的状态处理
- 处理属性的方式跟标签类似
- 属性结束时，我们把属性加到标签 Token(也就是标签)上。
- 最后 emit 还是 token
- 这个 html 标签和属性的解析在编译原理上叫做词法分析。

## HTML 的语法分析

## 参考

- <https://html.spec.whatwg.org/multipage/parsing.html#tokenization>
