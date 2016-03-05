define(["sorttable", "virtual-dom"], function (SortTable, V) {
  function linkName(d, trim) {
    return nodeName(d.source.node, trim) + " – " + nodeName(d.target.node, trim)
  }

  var headings = [{ name: "Knoten",
                    sort: function (a, b) {
                      return linkName(a).localeCompare(linkName(b))
                    },
                    reverse: false
                  },
                  { name: "TQ",
                    sort: function (a, b) { return a.tq - b.tq},
                    reverse: true
                  },
                  { name: "Entfernung",
                    sort: function (a, b) {
                      return (a.distance === undefined ? -1 : a.distance) -
                             (b.distance === undefined ? -1 : b.distance)
                    },
                    reverse: true
                  }]

  return function(linkScale, router) {
    var table = new SortTable(headings, 2, renderRow)

    function renderRow(d) {
      var td1Content = [V.h("a", {href: "#", onclick: router.link(d), title: linkName(d)}, linkName(d, true))]

      if (d.vpn)
        td1Content.push(" (VPN)")

      var td1 = V.h("td", td1Content)
      var td2 = V.h("td", {style: {color: linkScale(d.tq).hex()}}, showTq(d))
      var td3 = V.h("td", showDistance(d))

      return V.h("tr", [td1, td2, td3])
    }

    this.render = function (d)  {
      var el = document.createElement("div")
      el.last = V.h("div")
      d.appendChild(el)

      var h2 = document.createElement("h2")
      h2.textContent = "Verbindungen"
      el.appendChild(h2)

      el.appendChild(table.el)
    }

    this.setData = function (d) {
      table.setData(d.graph.links)
    }
  }
})
