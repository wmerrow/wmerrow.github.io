function log(something) {
  console.log(something);
};

d3.queue()
.defer(d3.csv, "data/output/party_control.csv")
.defer(d3.csv, "data/output/party_control_aggregated.csv")
.defer(d3.csv, "data/source/presidents/presidents.csv")
.await(function(error, data_all, data_all_ag, data_pres) {
  if (error) throw error;

  // metadata for party control
  var contCats = ['full_dem', 'split', 'full_rep', 'NA'];
  var contText = ['Democrat trifecta', 'Split control', 'Republican trifecta', 'Other'];
  var contPositions = [0.25, 0.5, 0.75, 0.5];
  var contOrder = [3, 2, 1, 4]; // custom order to use in sorting for stacked bar chart
  // object with control metadata to use for lookup
  var contMeta = {};
  contCats.forEach((key, i) => contMeta[key] = {"text": contText[i], "position": contPositions[i], "order": contOrder[i]});

  /// remove nebraska for now - Need to confirm Nebraska control to remove these two lines
  var data_all = data_all.filter(({state}) => state !== "Nebraska");
  var data_all_ag = data_all_ag.filter(({cont_text}) => cont_text !== "NA");

  // convert columns to numeric
  data_all.forEach(function(data){
    data.year = +data.year;
    data.fips = +data.fips;
    data.pop = +data.pop;
    data.government_cont = +data.government_cont;
    data.cont_text = data.cont_text;
    data.cont_text_prev_yr = data.cont_text_prev_yr;
    data.cont_flip = data.cont_flip;
    data.govparty_c = +data.govparty_c;
    data.hs_cont_alt = +data.hs_cont_alt;
    data.sen_cont_alt = +data.sen_cont_alt;
    data.hs_dem_prop_all = +data.hs_dem_prop_all;
    data.hs_rep_prop_all = +data.hs_rep_prop_all;
    data.sen_dem_prop_all = +data.sen_dem_prop_all;
    data.sen_rep_prop_all = +data.sen_rep_prop_all;
    data.pres_share_dem = +data.pres_share_dem;
    data.pres_share_rep = +data.pres_share_rep;
    data.pres_marg_rep = +data.pres_marg_rep;
  })

  data_all_ag.forEach(function(data){
    data.year = +data.year;
    data.pop = +data.pop;
    data.pop_pct = +data.pop_pct;
    data.pop_yr = +data.pop_yr;
    data.cont_text = data.cont_text;
    // add column for order using control metadata lookup
    data.order = contMeta[data.cont_text].order;
  })
  // sort aggregated data by custom order
  data_all_ag.sort((a,b)=>d3.ascending(a.order, b.order));

  // filter to 2021
  var data_all_2021 = data_all.filter(({year}) => year === 2021);
  var data_all_ag_2021 = data_all_ag.filter(({year}) => year === 2021);

  // nested data for bar chart
  var data_nest = d3.nest()
    .key(function(d) { return d.year; })
    .key(function(d) { return d.cont_text; })
    .rollup(function(v) { return d3.sum(v, function(d) { return d.pop_pct; }); })
    .entries(data_all_ag);
  
  var years = data_nest.map(function(d) { return d.key; })
  var data_stack = [];
  
  data_nest.forEach(function(d, i) {
    d.values = d.values.map(function(e) { return e.value; })
    var t ={}
    contCats.forEach(function(e, i) {
      t[e] = d.values[i]
    })
    t.year = d.key;
    data_stack.push(t)
  });
  
  var bar_data = d3.stack().keys(contCats)(data_stack);

  var oldWidth = 0;

  function render(){
    // if (oldWidth == innerWidth) return
    // oldWidth = innerWidth

    // var width = height = d3.select('#graph').node().offsetWidth;

    // if (innerWidth <= 2925){
    //   width = innerWidth
    //   height = innerHeight*.7
    // }

    // console.log(width, height);

    // 700 x 440 is roughly the map aspect ratio so bubbles end up centered in states
    var scalar = 1.37;
    var width = 700 * scalar;
    var mapAspect = 582.5 / 918.4; // map aspect ratio
    var height = width * mapAspect;
    var mapWidth = width * 0.3;
    var mapHeight = mapWidth * mapAspect;
    var mapWidthLg = width * 0.9;
    var mapHeightLg = mapWidthLg * mapAspect;
    var barChartWidth = width * 0.72;
    var barChartHeight = height * 0.3;

    var mapMargin = {
      top: height * 0.5,
      right: (width - mapWidth) * 0.5,
      bottom: 30,
      left: (width - mapWidth) * 0.5
    }

    var mapMarginLg = {
      top: 0.1,
      right: (width - mapWidthLg) * 0.5,
      bottom: 30,
      left: (width - mapWidthLg) * 0.5
    }

    var barChartMargin = {
      top: height * 0.15,
      right: (width - barChartWidth) * 0.5,
      bottom: 30,
      left: (width - barChartWidth) * 0.5
    }

    var r = 40;
    var textSize = 11;
    var nodePadding = 1;
    var strokeWidth = 3; // stroke for highlight rect and lines

    // color scale for control categories
    var color = d3.scaleOrdinal()
      .domain(contCats)
      .range(['#0078c2', '#b8b6b0', '#d6422b', '#bfbdb8']);
    /// bar chart colors need to be reversed for some reason, also split control uses lighter gray on bar chart
    var barColor = d3.scaleOrdinal()
      .domain(contCats)
      .range(['#d6422b', '#d1cfc9', '#0078c2', '#dddddd']);
      // .range(['#0078c2', '#92c5de', '#f4a582', '#d6422b', '#dddddd']);
      //.range(['#4393c3', '#92c5de', '#f4a582', '#d6604d', '#dddddd']);

    // data min and max
    var pop_max = d3.max(data_all_2021, function(d) { return d.pop; });
    var pop_min = d3.min(data_all_2021, function(d) { return d.pop; });
    var marg_rep_max = d3.max(data_all_2021, function(d) { return d.pres_marg_rep; });
    var marg_rep_min = d3.min(data_all_2021, function(d) { return d.pres_marg_rep; });
    // determine max margin of victory for either Rs or Ds (check if marg_rep_max or marg_rep_max is farther from 0)
    var max_marg = d3.max([marg_rep_max, Math.abs(marg_rep_min)]);

    // size scales
    var sizeChart = d3.scaleSqrt()
      .domain([0, pop_max])
      .range([0, 30 * scalar]); // max radius for charts
    var sizeMap = d3.scaleSqrt()
      .domain([0, pop_max])
      .range([0, 11 * scalar]); // max radius for map
    var sizeText = d3.scaleLinear()
      .domain([pop_min, (pop_max - pop_min) / 2]) // max domain is pop midpoint
      .range([8, 12]) // min and max font size
      .clamp(true); // specifies that values beyond max domain (largest states) should not be larger than max font size in range

    // map x y scales
    var xLonScale = d3.scaleLinear()
      .domain([0, 1])
      .range([mapMargin.left, width - mapMargin.right]);
    var yLatScale = d3.scaleLinear()
      .domain([0, 1])
      .range([mapMargin.top, mapHeight + mapMargin.top]);
    // large map x y scales
    var xLonScaleLg = d3.scaleLinear()
      .domain([0, 1])
      .range([mapMarginLg.left, width - mapMarginLg.right]);
    var yLatScaleLg = d3.scaleLinear()
      .domain([0, 1])
      .range([mapMarginLg.top, mapHeightLg + mapMarginLg.top]);
    // x scale for control
    var xContScale = d3.scaleOrdinal()
      .domain(contCats)
      .range(contPositions.map(function(x) { return x * width; })); // a new array multiplying each element of contPositions by width 
    // x scale for pres vote
    var xVoteScale = d3.scaleLinear()
      .domain([0 - max_marg, max_marg])
      .range([width * 0.1, width * 0.9]);
    var yLegScale = d3.scaleLinear()
      .domain([0, 16])
      .range([height * .8, height * 0.2]);
    // dummy scale
    var yDefault = 200;
    var dummyScale = d3.scaleLinear()
      .domain([-1000, 1000])
      .range([yDefault, yDefault]);

    // add svg
    var svg = d3.select('#graph').html('')
      .append('svg')
      .attr('width', width)
      .attr('height', height)
      .attr('id', 'mySvg');

    // set up basemap
    var basemap = d3.select('#mySvg').append("svg:image")
      .attr("xlink:href", "img/us_map.svg")
      .attr('id', 'basemap')
      .attr("width", mapWidth)
      .attr("x", mapMargin.left)
      .attr("y", mapMargin.top)
      .style('opacity', 0);
      // .style('display', 'none'); //margin.top);

    // add g after basemap so it goes on top
    var g = svg.append('g');


    // BAR CHART

    var xYearScale = d3.scaleBand()
        .domain(years)
        .range([barChartMargin.left, barChartWidth + barChartMargin.right])
        .paddingInner(0.05)
        .align(0.1);

    var yPopScale = d3.scaleLinear()
        .domain([0, 1])
        .range([barChartHeight + barChartMargin.top, barChartMargin.top]);

    // rectangles

    var barChart = g.append('g').selectAll("g")
      .data(bar_data)
      .enter().append("g")
      .style("fill", function(d) { return barColor(d.key); })  
    .selectAll("rect")
      .data(function(d) { return d; })
      .enter().append("rect")
      .attr('class', 'barRect')
      .attr("x", function(d) { return xYearScale(d.data.year); })
      .attr("y", function(d) { return yPopScale(d[1]); })
      .attr("height", function(d) { return yPopScale(d[0]) - yPopScale(d[1]); })
      .attr("width", xYearScale.bandwidth())
      .style('opacity', 0);

    // year labels

    var barYear = g.append('g')
      .selectAll(".presName")
      .data([1980, 1984, 1988, 1992, 1996, 2000, 2004, 2008, 2012, 2016, 2020])
      .enter().append("text")
      .attr('class', 'barYear')
      .text(d=> d)
      .attr("x", d=> xYearScale(d) + xYearScale.bandwidth()/2)
      .attr("y", barChartMargin.top + barChartHeight + 18)
      .style('opacity', 0);

    // president lines and names

    var presMargin = 7;

    var presLine = g.append('g')
      .selectAll(".presLine")
      .data(data_pres)
      .enter().append("line")
      .attr('class', 'presLine')
      .attr("x1", d=> xYearScale(d.start_year) + 3)
      .attr('x2', function(d){
        // special case for end of Biden line
        if (d.president === "Biden") {
          return xYearScale(d.end_year) + xYearScale.bandwidth();
        } else {
          return xYearScale(d.end_year) - 2;
      }})
      .attr("y1", barChartMargin.top - presMargin)
      .attr("y2", barChartMargin.top - presMargin)
      .style('opacity', 0);

    var presName = g.append('g')
      .selectAll(".presName")
      .data(data_pres)
      .enter().append("text")
      .attr('class', 'presName')
      // .text(function(d){
      //   if (d.president === "Biden") {
      //     return "";
      //   } else {
      //     return d.president;
      //   }
      // })
      .text(d=> d.president)
      // Biden anchored left
      .style("text-anchor", function(d){
        if (d.president === "Biden") {
          return 'start';
        } else {
          return 'middle';
        }
      })
      // midpoint of start and end year
      .attr("x", function(d){
        if (d.president === "Biden") {
          return xYearScale(d.start_year) + 3;
        } else {
          return (xYearScale(d.start_year) + xYearScale(d.end_year))/2 + 1;
        }
      })
      .attr("y", barChartMargin.top - presMargin - 6)
      .style('opacity', 0);

    var barTitle = g.append('g');

    var legendR = 5;

    // add legend circles
    barTitle.append('circle')
      .attr('class', 'legendCircle')
      .attr('cx', barChartMargin.left + 214)
      .attr('cy', 43)
      .attr('r', legendR)
      .style('fill', '#0078c2');
    barTitle.append('circle')
      .attr('class', 'legendCircle')
      .attr('cx', barChartMargin.left + 363)
      .attr('cy', 43)
      .attr('r', legendR)
      .style('fill', '#d6422b');
    barTitle.append('circle')
      .attr('class', 'legendCircle')
      .attr('cx', barChartMargin.left + 550)
      .attr('cy', 43)
      .attr('r', legendR)
      .style('fill', '#bfbdb8');

    barTitle
      .append("text")
      .attr('class', 'barTitle')
      .attr("x", barChartMargin.left)
      .attr("y", barChartMargin.top - 43)
      .style('opacity', 0)
      .append("tspan")
        .attr('class', 'barTitleSpanNormal')
        .text("Population living in states with ")
      .append("tspan")
        .attr('class', 'barTitleSpan')
        .attr('dx', 3 * legendR + 1)
        .text("Democrat trifectas, ")
        .style('fill', '#000000')
      .append("tspan")
        .attr('class', 'barTitleSpan')
        .attr('dx', 3 * legendR + 1)
        .text("Republican trifectas, and ")
        .style('fill', '#000000')
      .append("tspan")
        .attr('class', 'barTitleSpan')
        .attr('dx', 3 * legendR + 1)
        .text("split control")
        .style('fill', '#000000');


    // APPORTIONMENT LINES

    var appoYears = [1980, 1990, 2000, 2010, 2020];

    var appoLines = g.append('g')
      .selectAll(".appoLine")
      .data(appoYears)
      .enter().append("line")
      .attr('class', 'appoLine')
      .attr("x1", d=> xYearScale(d) + xYearScale.bandwidth())//*0.87)
      .attr("x2", d=> xYearScale(d) + xYearScale.bandwidth())//*0.87)
      .attr("y1", barChartMargin.top + barChartHeight)
      .attr("y2", barChartMargin.top + 1)
      .style('stroke-width', strokeWidth)
      .style('opacity', 0);

    // var appoLabels = g.append('g')
    //   .selectAll(".appoLabel")
    //   .data(appoYears)
    //   .enter().append("text")
    //   .attr('class', 'appoLabel')
    //   .text(d=> d)
    //   .attr("x", d=> xYearScale(d) + xYearScale.bandwidth())
    //   .attr("y", barChartMargin.top - 5)
    //   .style('opacity', 0);

    // PRES VOTE AXIS

    //add axis
    var axisHeight = yDefault + 25;
    var presAxis = g.append("g")
      .attr("class", "axis")
      .attr("transform", "translate(0," + (yDefault + (axisHeight / 2)) + ")")
      .call(d3.axisTop(xVoteScale)
              .ticks(10)
              .tickSize(axisHeight)
              // remove minus signs and append +D or +R, or change to Even
              .tickFormat((function (v) {
                  if (v == 0) {
                    return 'Even';
                  } else if (v < 0) {
                    return 'D +' + d3.format("0")(Math.abs(v*100)); 
                  } else if (v > 0) {
                    return 'R +' + d3.format("0")(Math.abs(v*100)); 
                  };
              }))
            )
      .call(g => g.select(".domain").remove())
      .style('opacity', 0);

    // style axis lines (different style for zero line)
    d3.selectAll("g.axis g.tick line")
        .style("stroke", function(d){
           if (d === 0) {
            return 'black';
           } else {
            return '#cccccc';
           }
        })
        .style("stroke-width", function(d){
           if (d === 0) {
            return 1.5;
           } else {
            return 1;
           }
        })
        .attr("y1", 0 - axisHeight)
        .attr("y2", function(d){
           if (d === 0) {
            return 0;
           } else {
            return 8 - axisHeight;
           }
        });

    // style and position axis text (different style for zero text)
    d3.selectAll("g.axis g.tick text")
        .style("fill", function(d){
           if (d === 0) {
            return 'black';
           } else {
            return '#aaaaaa';
           }
        })
        .attr("dy", -3);

    // BUBBLES

    var nodesForce = g.append("g")
      .selectAll(".nodeForce");

    var nodeLabels = g.append("g")
      .selectAll(".nodeLabel");

    var nodesNonForce = g.append("g")
      .selectAll(".nodeNonForce");

    var simulation = d3.forceSimulation();


    // UPDATE FUNCTION

    // update bubbles and labels using parameters depending on step of scrollytelling
    function updateNodes( nodeData,
                          xScale,
                          xInput,
                          yScale,
                          yInput,
                          cScale,
                          cInput,
                          sScale,
                          xStr,
                          yStr,
                          collStr,
                          newYear,
                          i) { 

      // transition /// keep this line within update, not sure why
      var t = d3.transition().duration(1000);

      // update bubble force layout for steps 0-3
      if (i < 4) {

        // Apply the general update pattern to the nodes
  
        nodesForce = nodesForce.data(nodeData, d=> d.state); /// what is d.state doing?
  
        nodesForce.exit().remove();

        nodesForce
          .style("stroke", "white")
          .style("stroke-width", 1.5)
          .transition(t)
          .style("fill", d=> cScale(d[cInput]))
          .attr("r", d=> sScale(d.pop));

        nodesForce = nodesForce.enter().append("circle")
          .attr("class", "nodeForce")
          .style("stroke", "white")
          .style("stroke-width", 1.5)
          .style("fill", d=> cScale(d[cInput]))
          .attr("r", d=> sScale(d.pop))
          .merge(nodesForce);

        // Apply the general update pattern to the labels

        nodeLabels = nodeLabels.data(nodeData, d=> d.state); /// what is d.state doing?
      
        nodeLabels.exit().remove();

        nodeLabels
          .transition(t)
          .text(d=> d.state_abbrev)
          .style("text-anchor", "middle")
          .style("font-size", d=> sizeText(d.pop))
          .style("stroke", d=> cScale(d[cInput]));

        nodeLabels = nodeLabels.enter().append("text")
          .attr("class", "nodeLabel")
          .text(d=> d.state_abbrev)
          .style("font-size", d=> sizeText(d.pop))
          .style("stroke", d=> cScale(d[cInput]))
          .merge(nodeLabels);

        simulation.nodes(nodeData)
          .force("x", d3.forceX().strength(xStr).x(function(d){
            // different x force for step 3
            if (i < 3) {
              return xScale(d[xInput]);
            } else {
              return (xScale(d[xInput]) + xYearScale(newYear) + xYearScale.bandwidth()/2 - width/2);
            }
          }))
          .force("y", d3.forceY().strength(yStr).y(d=> yScale(d[yInput])))
          // avoid collision - change strength and number of iterations to adjust
          .force("collide", d3.forceCollide().strength(collStr).radius(d=> sScale(d.pop) + nodePadding).iterations(10))
          .on('tick', function(){
            nodesForce
              // .transition().duration(100) /// transition on each tick to slow down bubbles, but this messes with bubble steps for some reason
              .attr("cx", d=> d.x)
              .attr("cy", d=> d.y);
            nodeLabels
              // .transition().duration(100) /// transition on each tick to slow down bubbles, but this messes with bubble steps for some reason
              .attr("x", d=> d.x)
              .attr("y", d=> d.y + textSize / 2 - 2); // adds half of text size to vertically center in bubbles
          });
        // re-energize the simulation
        simulation.alpha(1).restart();

        // hide non-force nodes
        d3.selectAll('.nodeNonForce').transition().style('opacity', 0);

      } else {
        // update non-force bubbles (without force layout) for steps 4 and on

        // Apply the general update pattern to the nodes
  
        nodesNonForce = nodesNonForce.data(nodeData, d=> d.state); /// what is d.state doing?
  
        nodesNonForce.exit().remove();

        nodesNonForce
          .style("stroke", function(d){
            // special stroke for states that flipped to R trifecta in 1995 and 2011
            if (d.cont_flip === "TRUE" && d.cont_text === "full_rep" && (newYear === 1995 || newYear === 2011 || newYear === 2021)) {
              return "black";
            } else {
              return "white";
            }
          })
          .style("stroke-width", function(d){
            if (d.cont_flip === "TRUE" && d.cont_text === "full_rep" && (newYear === 1995 || newYear === 2011 || newYear === 2021)) {
              return 5;
            } else {
              return 1.5;
            }
          })
          // need to change stroke-width before transition for some reason
          .transition(t)
          //.style('opacity', 1)
          .style("fill", d=> cScale(d[cInput]))
          .attr("r", d=> sScale(d.pop))
          .attr("cx", d=> xScale(d[xInput]) + xYearScale(newYear) + xYearScale.bandwidth()/2 - width/2)
          .attr("cy", d=> yScale(d[yInput]));

        nodesNonForce = nodesNonForce.enter().append("circle")
          .attr("class", "nodeNonForce")
          .style("stroke", function(d){
            // special stroke for states that flipped to R trifecta in 1995 and 2011
            if (d.cont_flip === "TRUE" && d.cont_text === "full_rep" && (newYear === 1995 || newYear === 2011 || newYear === 2021)) {
              return "black";
            } else {
              return "white";
            }
          })
          .style("stroke-width", function(d){
            if (d.cont_flip === "TRUE" && d.cont_text === "full_rep" && (newYear === 1995 || newYear === 2011 || newYear === 2021)) {
              return 5;
            } else {
              return 1.5;
            }
          })
          //.style('opacity', 1)
          .style("fill", d=> cScale(d[cInput]))
          .attr("r", d=> sScale(d.pop))
          .attr("cx", d=> xScale(d[xInput]) + xYearScale(newYear) + xYearScale.bandwidth()/2 - width/2)
          .attr("cy", d=> yScale(d[yInput]))
          .merge(nodesNonForce);

      }
      

      // var t = d3.timer(function(elapsed) {
      //     if (elapsed > 1000) {
      //         simulation.alphaTarget(0); //After 1000ms, rest
      //         //console.log("Time Passed")
      //         t.stop()
      //     };
      // }, 1); // start timer after 1ms

    } // end update function


    // LABELING

    // add control labels
    var contLabel = svg.append("g").selectAll('.headerLabel')
      .data(contPositions.slice(0,3)).enter()
      .append('text')
      .text(function(d, i) {
          return contText.slice(0,3)[i];
      })
      .attr('class', 'headerLabel')
      .attr('x', d=> width * d)
      .attr('y', height * 0.12);

    // add control numbers
    var contNumber = svg.append("g").selectAll('.number')
      .data(data_all_ag_2021).enter()
      .append('text')
      .text(d=> d3.format(".0%")(d.pop_pct) + " of the U.S. population")
      .attr('class', 'number')
      .attr('x', d=> width * contMeta[d.cont_text].position) // lookup corresponding position
      .attr('y', height * 0.16);

    // add pres vote label
    var presLabel = svg.append("g")
      .append('text')
      .text('Presidential vote')
      .attr('class', 'presLabel')
      .attr('x', width * 0.5)
      .attr('y', height * 0.09)
      .style('opacity', 0);

    // add year label
    var yearLabel = svg.append("g")
      .append('text')
      .text(2021)
      .attr('class', 'yearLabel')
      .attr('x', d=> xYearScale('2021') + xYearScale.bandwidth()/2)
      .attr('y', barChartMargin.top + barChartHeight + 22)
      .style('opacity', 0);

    // add year highlight rectangle
    var yearRect = svg.append("g")
      .append('rect')
      .attr('class', 'yearRect')
      // offset by half of stroke width so stroke doesn't overlap bars (since stroke is centered on rect edges)
      .attr('x', d=> xYearScale('2021') - strokeWidth/2)
      .attr('y', barChartMargin.top - strokeWidth/2 + 1)
      .attr('width', xYearScale.bandwidth() + strokeWidth)
      .attr('height', yPopScale(0) - yPopScale(1) + strokeWidth - 1)
      .style('stroke-width', strokeWidth)
      .style('opacity', 0);


    // GRAPH SCROLL WITH LISTENER

    var gs = d3.graphScroll()
        .container(d3.select('.container-1'))
        .graph(d3.selectAll('container-1 #graph'))
        .eventId('uniqueId1')  // namespace for scroll and resize events
        .sections(d3.selectAll('.container-1 #sections > div'))
        // .offset(innerWidth < 900 ? innerHeight - 30 : 200)
        .on('active', function(i){
          
          // STEPS (TURN WORD WRAP OFF TO VIEW AS TABLE)

          //var dataTest =  [data_all_2021,         data_all_2021,              data_all_2021,         data75,         1995,         2010,         2010,         2011,         2021];


          //i             0              1                  2             3             4             5             6             7             8             9             10            11            
          //year
          var dataYear =  [2021,         2021,              2021,         2021,         1977,         1994,         1995,         2010,         2011,         2020,         2021,         2021        ];
          // flags for showing/hiding content
          var introFlag = [true,         false,             false,        false,        false,        false,        false,        false,        false,        false,        false,        false       ];
          var presFlag =  [false,        true,              false,        false,        false,        false,        false,        false,        false,        false,        false,        false       ];
          var mapFlag =   [false,        false,             true,         true,         true,         true,         true,         true,         true,         true,         true,         false       ];
          var mapLgFlag = [true,         true,              true,         false,        false,        false,        false,        false,        false,        false,        false,        false       ];
          var frcFlag =   [true,         true,              true,         true,         false,        false,        false,        false,        false,        false,        false,        false       ];
          var nonFrcFlag =[false,        false,             false,        false,        true,         true,         true,         true,         true,         true,         true,         false       ];
          var barFlag =   [false,        false,             false,        true,         true,         true,         true,         true,         true,         true,         true,         true        ];
          var yearFlag =  [false,        false,             false,        true,         true,         true,         true,         true,         true,         true,         true,         false       ];
          var appoFlag =  [false,        false,             false,        false,        false,        false,        false,        false,        false,        false,        false,        true        ];
          // bubble x
          var xScales =   [xContScale,   xVoteScale,        xLonScaleLg,  xLonScale,    xLonScale,    xLonScale,    xLonScale,    xLonScale,    xLonScale,    xLonScale,    xLonScale,    xLonScale   ];
          var xInputs =   ['cont_text',  'pres_marg_rep',   'state_x',    'state_x',    'state_x',    'state_x',    'state_x',    'state_x',    'state_x',    'state_x',    'state_x',    'state_x'   ];
          // bubble y
          var yScales =   [dummyScale,   dummyScale,        yLatScaleLg,  yLatScale,    yLatScale,    yLatScale,    yLatScale,    yLatScale,    yLatScale,    yLatScale,    yLatScale,    yLatScale   ];
          var yInputs =   ['state_y',    'state_y',         'state_y',    'state_y',    'state_y',    'state_y',    'state_y',    'state_y',    'state_y',    'state_y',    'state_y',    'state_y'   ];
          // bubble color
          var cScales =   [color,        color,             color,        color,        color,        color,        color,        color,        color,        color,        color,        color       ];
          var cInputs =   ['cont_text',  'cont_text',       'cont_text',  'cont_text',  'cont_text',  'cont_text',  'cont_text',  'cont_text',  'cont_text',  'cont_text',  'cont_text',  'cont_text' ];          
          // bubble size
          var sScales =   [sizeChart,    sizeChart,         sizeChart,    sizeMap,      sizeMap,      sizeMap,      sizeMap,      sizeMap,      sizeMap,      sizeMap,      sizeMap,      sizeMap     ];
          // bubble x y strengths
          var xStrs =     [0.1,          0.8,               0.1,          0.1,          0.1,          0.1,          0.1,          0.1,          0.1,          0.1,          0.1,          0.1         ];
          var yStrs =     [0.1,          0.1,               0.1,          0.1,          0.1,          0.1,          0.1,          0.1,          0.1,          0.1,          0.1,          0.1         ];
          // bubble collision strength
          var collStrs =  [1,            1,                 0,            0,            0,            0,            0,            0,            0,            0,            0,            0           ];

          // filter data to new year
          var newData = data_all
            .filter(({year}) => year === dataYear[i]);

          // update bubbles and their labels
          updateNodes( newData,
                       xScales[i],
                       xInputs[i],
                       yScales[i],
                       yInputs[i],
                       cScales[i],
                       cInputs[i],
                       sScales[i],
                       xStrs[i],
                       yStrs[i],
                       collStrs[i],
                       dataYear[i],
                       i);

          // show and hide elements as needed
          // for some reason selecting using variables results in elements not fading out if you scroll too fast, but d3.selectAll doesn't have this issue

          // show or hide header labels
          if (introFlag[i] === true) {
            d3.selectAll('.headerLabel').transition().style('opacity', 1);
            d3.selectAll('.number').transition().style('opacity', 1);
          } else {
            d3.selectAll('.headerLabel').transition().style('opacity', 0);
            d3.selectAll('.number').transition().style('opacity', 0);
          }

          // show or hide pres vote axis and pres vote label
          if (presFlag[i] === true) {
            d3.selectAll('.axis').transition().style('opacity', 1);
            d3.selectAll('.presLabel').transition().style('opacity', 1);
          } else {
            d3.selectAll('.axis').transition().style('opacity', 0);
            d3.selectAll('.presLabel').transition().style('opacity', 0);
          }

          // show or hide map
          if (mapFlag[i] === true) {
            d3.select('#basemap').style('opacity', 1);
          } else {
            d3.select('#basemap').style('opacity', 0);
          };

          // different map size for step 2
          if (mapLgFlag[i] === true) {
            d3.select('#basemap')
              .transition().duration(1000)
              .attr("width", mapWidthLg)
              .attr("x", mapMarginLg.left)
              .attr("y", mapMarginLg.top);
          } else {
            d3.select('#basemap')
              .transition().duration(1000)
              .attr("width", mapWidth)
              //.attr("x", mapMargin.left)
              .attr('x', xYearScale(dataYear[i]) + xYearScale.bandwidth()/2 - mapWidth/2)
              .attr("y", mapMargin.top);
          };

          // show or hide bar chart and node labels
          if (barFlag[i] === true) {
            d3.selectAll('.nodeLabel').style('opacity', 0);
            d3.selectAll('.barRect').style('opacity', 1);
            d3.selectAll('.barYear').style('opacity', 1);
            d3.selectAll('.barTitle').style('opacity', 1);
            d3.selectAll('.legendCircle').style('opacity', 1);
            d3.selectAll('.presName').style('opacity', 1);
            d3.selectAll('.presLine').style('opacity', 1);
          } else {
            d3.selectAll('.nodeLabel').style('opacity', 1);
            d3.selectAll('.barRect').style('opacity', 0);
            d3.selectAll('.barYear').style('opacity', 0);
            d3.selectAll('.barTitle').style('opacity', 0);
            d3.selectAll('.legendCircle').style('opacity', 0);
            d3.selectAll('.presName').style('opacity', 0);
            d3.selectAll('.presLine').style('opacity', 0);
          };

          // show or hide bar chart and node labels
          if (yearFlag[i] === true) {
            d3.selectAll('.yearLabel').style('opacity', 0);
            d3.selectAll('.yearRect').style('opacity', 1);
          } else {
            d3.selectAll('.yearLabel').style('opacity', 0);
            d3.selectAll('.yearRect').style('opacity', 0);
          };

          // show or hide force nodes
          if (frcFlag[i] === true) {
            d3.selectAll('.nodeForce').style('opacity', 1);
          } else {
            d3.selectAll('.nodeForce').style('opacity', 0);
          };

          // show or hide non-force nodes
          if (nonFrcFlag[i] === true) {
            d3.selectAll('.nodeNonForce').style('opacity', 1);
          } else {
            d3.selectAll('.nodeNonForce').style('opacity', 0);
          };

          // show or hide apportionment lines
          if (appoFlag[i] === true) {
            d3.selectAll('.appoLine').transition().duration(750).style('opacity', 1);
          } else {
            d3.selectAll('.appoLine').transition().duration(750).style('opacity', 0);
          };

          // update year label /// need to add interpolation transition effect
          yearLabel
            .text(dataYear[i])
            .transition().duration(1000)
            .attr('x', d=> xYearScale(dataYear[i]) + xYearScale.bandwidth()/2);

          // update year highlight rect
          yearRect
            .transition().duration(1000)
            .attr('x', d=> xYearScale(dataYear[i]) - strokeWidth/2);

          // // change bar opacity depending on year
          // barChart.style('opacity', function(d) {
          //   if (+d.data.year === dataYear[i]) {
          //     return 1;
          //   } else { 
          //     return 0.6;
          //   }
          // });

        }); // end 'active' listener

    d3.select('#source')
        .styles({'margin-bottom': window.innerHeight - 450 + 'px', padding: '100px'})
  
  } // end render function
  
  // initial render
  render()
  
  // listener to render on resize
  d3.select(window).on('resize', render)

}); // end d3.csv

