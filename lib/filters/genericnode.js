define([], function () {
  return function (name, key, value, f) {
    var negate = false
    var refresh

    var label = document.createElement("label")
    var strong = document.createElement("strong")
    label.textContent = name + " "
    label.appendChild(strong)

    function run(d) {
      var o = dictGet(d, key.slice(0))

      if (f)
        o = f(o)

      return o === value ? !negate : negate
    }

    function setRefresh(f) {
      refresh = f
    }

    function draw(el) {
      if (negate)
        el.parentNode.classList.add("not")
      else
        el.parentNode.classList.remove("not")

      strong.textContent = (negate ? "¬" : "" ) + value
    }

    function render(el) {
      el.appendChild(label)
      draw(el)

      label.onclick = function () {
        negate = !negate

        draw(el)

        if (refresh)
          refresh()
      }
    }

    return { run: run,
             setRefresh: setRefresh,
             render: render
           }
  }
})
