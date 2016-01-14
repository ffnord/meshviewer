define(["c3", "d3"], function (c3, d3) {

    var charts = function (node, config) {
        this.node = node

        this.chartConfig = config
        this.chart = null

        this.zoomConfig = {
            "levels": [
                {"label": "8h", "from": "8h", "interval": "15min"},
                {"label": "24h", "from": "26h", "interval": "1h"},
                {"label": "1m", "from": "1mon", "interval": "1d"},
                {"label": "1y", "from": "1y", "interval": "1mon"}
            ]
        }
        this.zoomLevel = 0

        this.c3Config = {
            "size": {
                "height": 240
            },
            padding: {
                bottom: 30
            },
            "legend": {
                "item": {
                    "onclick": function (id) {
                        this.api.hide()
                        this.api.show(id)
                    }
                }
            },
            "tooltip": {
                "format": {
                    "value": this.c3FormatToolTip.bind(this)
                }
            },
            "axis": {
                "x": {
                    "type": "timeseries",
                    "tick": {
                        "format": this.c3FormatXAxis.bind(this),
                        "rotate": -45
                    }
                },
                "y": {
                    "min": 0,
                    "padding": {
                        "bottom": 0
                    }
                }
            }
        }

        this.cache = []

        this.init()
    }

    charts.prototype = {

        init: function () {
            // Workaround for endless loop bug
            if (this.c3Config.axis.x.tick && this.c3Config.axis.x.tick.format && typeof this.c3Config.axis.x.tick.format === "function") {
                if (this.c3Config.axis.x.tick.format && !this.c3Config.axis.x.tick._format)
                    this.c3Config.axis.x.tick._format = this.c3Config.axis.x.tick.format
                this.c3Config.axis.x.tick.format = function (val) {
                    return this.c3Config.axis.x.tick._format(val)
                }.bind(this)
            }

            // Configure metrics
            this.c3Config.data = {
                "keys": {
                    "x": "time",
                    "value": this.chartConfig.metrics.map(function (metric) {
                        return metric.id
                    })
                },
                "colors": this.chartConfig.metrics.reduce(function (collector, metric) {
                    collector[metric.id] = metric.color
                    return collector
                }, {}),
                "names": this.chartConfig.metrics.reduce(function (collector, metric) {
                    collector[metric.id] = metric.label
                    return collector
                }, {}),
                "hide": this.chartConfig.metrics.map(function (metric) {
                    return metric.id
                }).filter(function (id) {
                    return id !== this.chartConfig.defaultMetric
                }.bind(this))
            }
        },

        render: function () {
            var div = document.createElement("div")
            div.classList.add("chart")
            var h4 = document.createElement("h4")
            h4.textContent = this.chartConfig.name
            div.appendChild(h4)


            // Render chart
            this.load(function (data) {
                div.appendChild(this.renderChart(data))

                // Render zoom controls
                if (this.zoomConfig.levels.length > 0)
                    div.appendChild(this.renderZoomControls())

            }.bind(this))

            return div
        },

        renderChart: function (data) {
            this.c3Config.data.json = data
            this.chart = c3.generate(this.c3Config)
            return this.chart.element
        },

        updateChart: function (data) {
            this.c3Config.data.json = data
            this.chart.load(this.c3Config.data)
        },

        renderZoomControls: function () {
            // Draw zoom controls
            var zoomDiv = document.createElement("div")
            zoomDiv.classList.add("zoom-buttons")

            var zoomButtons = []
            this.zoomConfig.levels.forEach(function (v, level) {
                var btn = document.createElement("button")
                btn.classList.add("zoom-button")
                btn.setAttribute("data-zoom-level", level)

                if (level === this.zoomLevel)
                    btn.classList.add("active")

                btn.onclick = function () {
                    if (level !== this.zoomLevel) {
                        zoomButtons.forEach(function (v, k) {
                            if (level !== k)
                                v.classList.remove("active")
                            else
                                v.classList.add("active")
                        })
                        this.setZoomLevel(level)
                    }
                }.bind(this)
                btn.textContent = v.label
                zoomButtons[level] = btn
                zoomDiv.appendChild(btn)
            }.bind(this))
            return zoomDiv
        },

        setZoomLevel: function (level) {
            if (level !== this.zoomLevel) {
                this.zoomLevel = level
                this.load(this.updateChart.bind(this))
            }
        },

        load: function (callback) {
            if (this.cache[this.zoomLevel])
                callback(this.cache[this.zoomLevel])
            else {
                var url = this.chartConfig.data.url +
                    "?" +
                    this.chartConfig.data.parameters.join("&")

                var zoomConfig = this.zoomConfig.levels[this.zoomLevel]

                var id = this.node.nodeinfo.node_id

                if (this.chartConfig.quirks
                    && Array.isArray(this.chartConfig.quirks)
                    && this.chartConfig.quirks.indexOf("id_to_mac") >= 0) {

                    // Quirk for legacy graphite data of Freifunk Aachen (data is stored by the node's mac address)
                    var regex = /^([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i
                    var match = regex.exec(id)
                    if (match)
                        id = match[1] + ":" + match[2] + ":" + match[3] + ":" + match[4] + ":" + match[5] + ":" + match[6]
                }

                // Using split as workaround for replacing all occurrences (to avoid regexps)
                url = url.split("###NODE_ID###").join(id)
                url = url.split("###ZOOM_FROM###").join(zoomConfig.from)
                url = url.split("###ZOOM_INTERVAL###").join(zoomConfig.interval)

                // In case we will have multiple urls in the future
                Promise.all([url].map(getJSON)).then(function (data) {
                    this.cache[this.zoomLevel] = this.parse(data)
                    callback(this.cache[this.zoomLevel])
                }.bind(this))
            }
        },

        parse: function (results) {
            var data = []
            results.forEach(function (d) {
                if (d[0] && d[0].target && d[0].datapoints)
                    d[0].datapoints.forEach(function (dp, dpk) {
                        var tmp = {"time": new Date(dp[1] * 1000)}
                        for (var i = 0; i < d.length; i++) {
                            var target = d[i].target
                            var v = (d[i].datapoints[dpk] ? d[i].datapoints[dpk][0] : 0)
                            tmp[target] = this.formatValue(target, v)
                        }
                        data.push(tmp)
                    }.bind(this))
            }.bind(this))
            return data
        },

        c3FormatToolTip: function (d, ratio, id) {
            switch (id) {
                case "uptime":
                    return d.toFixed(1) + " Tage"
                default:
                    return d
            }
        },

        c3FormatXAxis: function (d) {
            var pad = function (number, pad) {
                var N = Math.pow(10, pad)
                return number < N ? ("" + (N + number)).slice(1) : "" + number
            }
            switch (this.zoomLevel) {
                case 0: // 8h
                case 1: // 24h
                    return pad(d.getHours(), 2) + ":" + pad(d.getMinutes(), 2)
                case 2: // 1m
                    return pad(d.getDate(), 2) + "." + pad(d.getMonth() + 1, 2)
                case 3: // 1y
                    return ["Jan", "Feb", "Mrz", "Apr", "Mai", "Jun", "Jul", "Aug", "Sep", "Okt", "Nov", "Dez"][d.getMonth()]
                default:
                    break
            }
        },

        formatValue: function (id, value) {
            switch (id) {
                case "loadavg":
                    return (d3.format(".2r")(value))
                case "clientcount":
                    return (Math.ceil(value))
                case "uptime":
                    return (value / 86400)
                default:
                    return value
            }
        }

    }


    return charts
})
