require(["main", "helper"], function (main) {
  getJSON("config.json").then(main)
})
