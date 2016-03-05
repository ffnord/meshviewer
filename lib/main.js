define(["moment", "router", "leaflet", "gui", "numeral"],
function (moment, Router, L, GUI, numeral) {
  return function (config) {
    function handleData(data) {
      var dataNodes = data[0]
      var dataGraph = data[1]

      if (dataNodes.version !== 1 || dataGraph.version !== 1) {
        var err = "Unsupported nodes or graph version: " + dataNodes.version + " " + dataGraph.version
        throw err
      }

      function rearrangeLinks(d) {
        d.source += dataGraph.batadv.nodes.length
        d.target += dataGraph.batadv.nodes.length
      }

      for (var i = 2; i < data.length; ++i) {
        if (data[i].version !== 1) {
          var vererr = "Unsupported nodes or graph version: " + data[i].version
          throw vererr
        }

        if(i % 2) {
          data[i].batadv.links.map(rearrangeLinks)

          dataGraph.batadv.nodes = dataGraph.batadv.nodes.concat(data[i].batadv.nodes)
          dataGraph.batadv.links = dataGraph.batadv.links.concat(data[i].batadv.links)
        } else
          for (var attr in data[i].nodes) { dataNodes.nodes[attr] = data[i].nodes[attr] }
      }

      var nodes = Object.keys(dataNodes.nodes).map(function (key) { return dataNodes.nodes[key] })

      nodes = nodes.filter( function (d) {
        return "firstseen" in d && "lastseen" in d
      })

      nodes.forEach( function(node) {
        node.firstseen = moment.utc(node.firstseen).local()
        node.lastseen = moment.utc(node.lastseen).local()
      })

      var now = moment()
      var age = moment(now).subtract(config.maxAge, "days")

      var newnodes = limit("firstseen", age, sortByKey("firstseen", nodes).filter(online))
      var lostnodes = limit("lastseen", age, sortByKey("lastseen", nodes).filter(offline))

      var graphnodes = dataNodes.nodes
      var graph = dataGraph.batadv

      graph.nodes.forEach( function (d) {
        if (d.node_id in graphnodes)
          d.node = graphnodes[d.node_id]
      })

      graph.links.forEach( function (d) {
        if (graph.nodes[d.source].node)
          d.source = graph.nodes[d.source]
        else
          d.source = undefined

        if (graph.nodes[d.target].node)
          d.target = graph.nodes[d.target]
        else
          d.target = undefined
      })

      var links = graph.links.filter( function (d) {
        return d.source !== undefined && d.target !== undefined
      })

      links.forEach( function (d) {
        var ids = [d.source.node.nodeinfo.node_id, d.target.node.nodeinfo.node_id]
        d.id = ids.sort().join("-")

        if (!("location" in d.source.node.nodeinfo && "location" in d.target.node.nodeinfo))
          return

        d.latlngs = []
        d.latlngs.push(L.latLng(d.source.node.nodeinfo.location.latitude, d.source.node.nodeinfo.location.longitude))
        d.latlngs.push(L.latLng(d.target.node.nodeinfo.location.latitude, d.target.node.nodeinfo.location.longitude))

        d.distance = d.latlngs[0].distanceTo(d.latlngs[1])
      })

      nodes.forEach( function (d) {
        d.neighbours = []
      })

      links.forEach( function (d) {
        d.source.node.neighbours.push({ node: d.target.node, link: d })
        d.target.node.neighbours.push({ node: d.source.node, link: d })
      })

      return { now: now,
               timestamp: moment.utc(data[0].timestamp).local(),
               nodes: {
                 all: nodes,
                 new: newnodes,
                 lost: lostnodes
               },
               graph: {
                 links: links,
                 nodes: graph.nodes
               }
             }
    }

    numeral.language("de")
    moment.locale("de")

    var router = new Router()

    var urls = []

    if(typeof config.dataPath === "undefined")
	config.dataPath = [""]

    if (typeof config.dataPath === "string" || config.dataPath instanceof String)
      config.dataPath = [config.dataPath]

    for (var i = 0; i < config.dataPath.length; ++i) {
      urls.push(config.dataPath[i] + "nodes.json")
      urls.push(config.dataPath[i] + "graph.json")
    }

    function update() {
      return Promise.all(urls.map(getJSON))
                    .then(handleData)
    }

    update()
      .then(function (d) {
        var gui = new GUI(config, router)
        gui.setData(d)
        router.setData(d)
        router.start()

        window.setInterval(function () {
          update().then(function (d) {
            gui.setData(d)
            router.setData(d)
          })
        }, 60000)
      })
      .catch(function (e) {
        document.body.textContent = e
        console.log(e)
      })
  }
})
