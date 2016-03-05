define(function () {
  return function (config, el, router, d) {
    var h2 = document.createElement("h2")
    var a1 = document.createElement("a")
    a1.href = "#"
    a1.onclick = router.node(d.source.node)
    a1.textContent = nodeName(d.source.node, true)
    a1.title = nodeName(d.source.node)
    h2.appendChild(a1)
    h2.appendChild(document.createTextNode(" – "))
    var a2 = document.createElement("a")
    a2.href = "#"
    a2.onclick = router.node(d.target.node)
    a2.textContent = nodeName(d.target.node, true)
    a2.title = nodeName(d.target.node)
    h2.appendChild(a2)
    el.appendChild(h2)

    var attributes = document.createElement("table")
    attributes.classList.add("attributes")

    attributeEntry(attributes, "TQ", showTq(d))
    attributeEntry(attributes, "Entfernung", showDistance(d))
    attributeEntry(attributes, "VPN", d.vpn ? "ja" : "nein")
    var hw1 = dictGet(d.source.node.nodeinfo, ["hardware", "model"])
    var hw2 = dictGet(d.target.node.nodeinfo, ["hardware", "model"])
    attributeEntry(attributes, "Hardware", (hw1 != null ? hw1 : "unbekannt") + " – " + (hw2 != null ? hw2 : "unbekannt"))

    el.appendChild(attributes)
  }
})
