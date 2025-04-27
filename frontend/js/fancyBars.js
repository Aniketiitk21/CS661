// helper that adds a gradient + a soft drop-shadow to the current SVG
export function makeFancyBars(svg, colour1 = "#4C79A7", colour2 = "#1f4f82") {
    const defs = svg.append("defs");
  
    const grad = defs.append("linearGradient")
      .attr("id", "barGradient")
      .attr("x1", "0%").attr("y1", "0%")
      .attr("x2", "0%").attr("y2", "100%");
    grad.append("stop").attr("offset", 0).attr("stop-color", colour1);
    grad.append("stop").attr("offset", 1).attr("stop-color", colour2);
  
    const f = defs.append("filter")
      .attr("id", "barShadow")
      .attr("x", "-5%").attr("y", "-5%")
      .attr("width", "110%").attr("height", "120%");
    f.append("feGaussianBlur").attr("in", "SourceAlpha").attr("stdDeviation", 3).attr("result", "blur");
    f.append("feOffset").attr("in", "blur").attr("dy", 3).attr("result", "offsetBlur");
    const m = f.append("feMerge");
    m.append("feMergeNode").attr("in", "offsetBlur");
    m.append("feMergeNode").attr("in", "SourceGraphic");
  }
  
