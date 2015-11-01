define([], function () {
  return function () {
    var refreshFunction
    var input = document.createElement("input")
    input.addEventListener("input", function () {
      if (refreshFunction)
        refreshFunction()
    })

    var value = document.createElement("strong")
    value.classList.add("input")

    updateValue()

    function updateValue() {
      value.textContent = input.value
    }

    function run(d) {
      return d.nodeinfo.hostname.toLowerCase().includes(input.value.toLowerCase())
    }

    function setRefresh(f) {
      refreshFunction = f
    }

    function render(el) {
      var label = document.createElement("label")
      label.textContent = "Hostname"
      el.appendChild(label)
      el.appendChild(document.createTextNode(" "))
      el.appendChild(value)

      el.onclick = function () {
        el.removeChild(value)
        el.appendChild(input)
        input.focus()
      }

      input.onblur = blur
      input.onkeypress = function (e) {
        if (e.keyCode === 13)
          input.blur()
      }

      function blur() {
        updateValue()

        el.removeChild(input)
        el.appendChild(value)
      }
    }

    return { run: run,
             setRefresh: setRefresh,
             render: render
           }
  }
})
