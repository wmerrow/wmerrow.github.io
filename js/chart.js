// create simple bubble plot for homepage

// chart area
var width = 700;
var height = 215;
    
// margins
var margin = {
    top: 25,
    right: 90,
    bottom: 15,
    left: 90
};
   
// select svg
var svg = d3.select("#chart")
    // .attr("width", width)
    // .attr("height", height)
    .attr("viewBox","0 0 " + width + " " + height)
    .attr("preserveAspectRatio","xMidYMid meet");


d3.csv("data/parties.csv", function(data) {

    // DATA

    // filter to each country's most recent election
    var data = data.filter(({is_last_election}) => is_last_election === "TRUE");

    // SCALES

    // size
    var bubbleSize = d3.scaleSqrt()
        .domain([0, 50])
        .range([0, 10]);
    // x
    var bubbleImmigX = d3.scaleLinear()
        .domain([5, -5])
        .range([margin.left, width - margin.right]);
    // y
    var bubbleIllibY = d3.scaleLinear()
        .domain([0, 1])
        .range([margin.top, height - margin.bottom]);
    // color
    var immigColor = d3.scaleLinear()
        .domain([-5, 5])
        .range(['red','blue'])
        .interpolate(d3.interpolateRgb);
    // var illibColor = d3.scaleLinear()
    //     .domain([1, 0])
    //     .range(['#000000','#aaaaaa'])
    //     .interpolate(d3.interpolateRgb);

    // transition durations for two stages of animation
    var t1 = 2000;
    var t2 = 2000;

    // AXIS LINE

    var xAxis = svg.append("g")
      .attr("transform", "translate(0," + margin.top + ")")
      .attr('class', 'axis')
      .attr('id', 'xAxis')
      .style('opacity', 0)
      .call(d3.axisTop(bubbleImmigX)
        .tickValues([])
        .tickSize(0));

    xAxis.transition().duration(t1)
        .style('opacity', 1);

    // BUBBLES

    var bubbles = svg.append("g").selectAll('circle_fri')
        .data(data.sort(function(a,b) {return d3.descending(+a.v2pavote, +b.v2pavote);})) // sort bubbles so smallest are on top
        .enter()
        .append('circle')
        .attr('cx', width / 2)
        .attr('cy', margin.top)
        .attr('r', d=> bubbleSize(+d.v2pavote))
        .style('fill', '#aaaaaa')
        .style('opacity', 0)
        .transition().duration(t1)
        .style('opacity', 1)
        .style('stroke', '#ffffff')
        .style('stroke-width', '0.5px');

    bubbles.transition().duration(t2)
        .attr('cx', d=> bubbleImmigX(+d.v2paimmig))
        .style('fill', d=> immigColor(+d.v2paimmig));
        // .transition().duration(1250)
        // .attr('cy', d=> bubbleIllibY(+d.v2xpa_illiberal))
        // .style('fill', d=> illibColor(+d.v2xpa_illiberal));

} );
