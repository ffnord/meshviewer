define(function () {
   return function (config) {
    function setTitle(d) {
      var title = [config.siteName]

      if (d !== undefined)
        title.push(d)

      document.title = title.join(": ")
    }

    this.resetView = function () {
      setTitle()
    }

    this.gotoNode = function (d) {
      if (d)
        setTitle(nodeName(d))
    }

    this.gotoLink = function (d) {
      if (d)
        setTitle(nodeName(d.source.node) + " – " + nodeName(d.target.node))
    }

    this.destroy = function () {
    }

    return this
  }
})
