(function(exports){

// dom elements for control elements (sliders, toggles, buttons and radiobuttons)
// they take  controlelement objects and translate them to dom elements
// that can be added using d3.append(), e.g. select().append(buttonElement)

 
exports.buttonElement = function(d,i){

	var backbox ;
	var hakenschniepel = document.createElementNS("http://www.w3.org/2000/svg", "g");	

	var s = d3.select(hakenschniepel).append("g")
		.attr("transform","translate("+(-d.size()/2)+","+(-d.size()/2)+")")
		.attr("class", "button")
		.attr("id", "button_" + d.id())

	if (d.shape()=="rect"){
		backbox = s.append("rect")
			.attr("width",d.size())
			.attr("height",d.size())
			.attr("rx",5).attr("ry",5)
	} else {
		backbox = s.append("circle")
			.attr("r",d.size()/2)
			.attr("transform","translate("+d.size()/2+","+d.size()/2+")")
	}
	
	backbox.attr("class","button-background")
		.on("mouseover",function(x){
			d3.select(this).attr("class","button-background-hover")
			d3.select("#button_" + d.id()).select("path")
				.attr("class","button-symbol-hover")
		})
		.on("mouseout",function(){
			d3.select(this).attr("class","button-background")
			d3.select("#button_" + d.id()).select("path")
				.attr("class","button-symbol")
		})
		.on("click",function(){
			var knut = d.value();
			var gg = d.actions();
			d.parameter().value = (knut + 1 ) % gg.length;  
			
			d3.select(this)
				.transition().duration(1000).attr("class","button-background-lit")
				.transition().duration(1000).attr("class","button-background")
			
			d3.select("#button_"+d.id()).selectAll("path")
				.attr("d",symbol(gg[d.value()],d.innersize()/2))
				.transition().attr("class","button-symbol-lit")
				.transition().attr("class","button-symbol")
			d.update(d);
		})
	
	s.append("path")
		.attr("d",symbol(d.actions()[d.value()],d.innersize()/2))
		.attr("transform","translate("+d.size()/2+","+d.size()/2+")")
		.attr("class","button-symbol")
	
	return hakenschniepel;
}

exports.toggleElement = function(d,i){
	
	d.X = d3.scaleOrdinal()
		.domain([false,true])
		.range([0, d.width() ])
	
	var hakenschniepel = document.createElementNS("http://www.w3.org/2000/svg", "g");	
	
	var s = d3.select(hakenschniepel)
		.attr("class", "toggle")
		.attr("id", "toggle_" + d.id())

	s.append("line")
		.attr("class", "track")
		.attr("x1", d.X.range()[0]).attr("x2", d.X.range()[1])
		.style("stroke-width", d.trackSize() + 2 * d.trackBorder())
	
	s.append("line")
		.attr("id", "inset_" + d.id())
		.attr("class", d.parameter().value ? "track-inset-lit" : "track-inset")
		.attr("x1", d.X.range()[0]).attr("x2", d.X.range()[1])
		.style("stroke-width", d.trackSize())
	
	s.append("line")
		.attr("class", "track-overlay")
		.attr("x1", d.X.range()[0]).attr("x2", d.X.range()[1])
		.style("stroke-width", 2* d.handleSize())
		.on("click",function(){
			d.parameter().value = ! d.parameter().value;
			d3.selectAll("#handle_" + d.id()).transition()
				.attr("cx", d.X(d.parameter().value))
			d3.selectAll("#inset_"+d.id())
				.attr("class",d.parameter().value ?  "track-inset-lit" : "track-inset")
			d.update(d);
		})
		
	s.insert("circle", ".track-overlay")
		.attr("class", "handle")
		.attr("id", "handle_" + d.id())
		.attr("r", d.handleSize())
		.attr("cx", d.X(d.value()));

	s.append("text").text(d.name())
		.attr("class", "tag")
		.style("opacity",d.labeled() ? 1 : 0)
		.attr("transform", "translate(" + (0 - d.handleSize()) + "," + (-2 * d.handleSize()) + ")")

	return hakenschniepel;	
	
	
}

exports.sliderElement = function(d,i) {
	
	var hakenschniepel = document.createElementNS("http://www.w3.org/2000/svg", "g")

	d.X = d3.scaleLinear()
		.domain(d.range())
		.range([0, d.width()]).clamp(true);

	
	var s = d3.select(hakenschniepel)
		.attr("class", "slider")
		.attr("id", "slider_" + d.id())

	s.append("line")
		.attr("class", "track")
		.attr("x1", d.X.range()[0]).attr("x2", d.X.range()[1])
		.style("stroke-width", d.trackSize() + 2 * d.trackBorder())

	s.append("line")
		.attr("class", "track-inset")
		.attr("x1", d.X.range()[0]).attr("x2", d.X.range()[1])
		.style("stroke-width", d.trackSize())

	s.append("line")
		.attr("class", "track-overlay")
		.attr("x1", d.X.range()[0]).attr("x2", d.X.range()[1])
		.style("stroke-width", 2* d.handleSize())
		.call(d3.drag()
			.on("start drag", function() {
				var value = d.X.invert(d3.event.x);
				d3.selectAll("#handle_" + d.id()).attr("cx", d.X(value))
				d.parameter().value = value;
				d.update(d);
			})
		);

	s.insert("circle", ".track-overlay")
		.attr("class", "handle")
		.attr("id", "handle_" + d.id())
		.attr("r", d.handleSize())
		.attr("cx", d.X(d.value()));

	s.append("text").text(d.name())
		.attr("class", "tag")
		.style("opacity",d.labeled() ? 1 : 0)
		.attr("transform", "translate(" + (0 - d.handleSize()) + "," + (-2 * d.handleSize()) + ")")

	return hakenschniepel;
}

exports.radioElement = function(d,i){
	
	var hakenschniepel = document.createElementNS("http://www.w3.org/2000/svg", "g");
	var N = d.choices().length;
	var n = d3.range(N);
	var b = new widget.block([N],d.size(),0,"[]");
	
	var checkbox = d3.select(hakenschniepel).attr("class","radio");

	var button = checkbox.selectAll(".radiobutton").data(n).enter().append("g")
		.attr("class","radiobutton")
		.attr("id",function(x,j){return "radiobutton_"+ d.id() + "_" +j})
		.attr("transform",function(x,j){
			return d.alignment()=="vertical" ? "translate(0,"+b.x(j)+")" : "translate("+b.x(j)+",0)";
		})
	
	var background, led;
	
	if (d.shape()=="rect"){
		
		background = button.append("rect")
			.attr("width",d.buttonsize())
			.attr("height",d.buttonsize())
			.attr("rx",2)
			.attr("ry",2)
			.attr("class","radiobutton-background")
			.attr("transform","translate("+(-d.buttonsize()/2)+","+(-d.buttonsize()/2)+")")
		
		led = button.append("rect")
			.attr("width",d.buttoninnersize())
			.attr("height",d.buttoninnersize())
			.attr("rx",2)
			.attr("ry",2)
			.attr("class","radiobutton-off")
			.attr("transform","translate("+(-d.buttoninnersize()/2)+","+(-d.buttoninnersize()/2)+")")
			.attr("class",function(x,j){return j==d.value() ? "radiobutton-on" : "radiobutton-off"})
	} else {
		
		background = button.append("circle")
			.attr("r",d.buttonsize()/2)	
			.attr("class","radiobutton-background")
		
		led = button.append("circle")
			.attr("r",d.buttoninnersize()/2)
			.attr("class",function(x,j){return j==d.value() ? "radiobutton-on" : "radiobutton-off"})
		
	}
	
	background
		.on("mouseover",function(x,j){
			d3.select("#radiobutton_"+d.id() + "_" +j).select(".radiobutton-off")
			.attr("class","radiobutton-hover")

		})
		.on("mouseout",function(){
				led.attr("class",function(x,j){return j==d.value() ? "radiobutton-on" : "radiobutton-off"})
		})
		.on("click",function(x,j){
			d.parameter().value=j;
			led.attr("class",function(z,k){return k==d.value() ? "radiobutton-on" : "radiobutton-off"})
			d.update(d);
		})
	
	button.append("text")
		.attr("class","tag")
		.text(function(x,j){return d.choices()[j]})
		.attr("alignment-baseline","middle")
		.attr("transform",function(x){
				console.log(d)
				return d.alignment()==="vertical" ? "translate("+(d.buttonsize()/2+d.padding())+",0)" : "translate(0,"+(d.buttonsize()/2+d.padding())+")"
		})
		.style("font-size",d.fontsize())
		.attr("text-anchor",function(x){
			return d.alignment()==="horizontal" ? "middle" : "left"
		})
	
	return hakenschniepel;
}

// control element objects

exports.toggle = function(p){
	var parameter = p,
		handleSize = 8,
		trackSize = 16,
		trackBorder = 0.5,
		labeled = true,
		update = function(x){};

		this.parameter = getset(parameter);
		this.update = getset(update);
		this.handleSize = getset(handleSize);
		this.trackSize = getset(trackSize);
		this.trackBorder = getset(trackBorder);
		this.labeled = getset(labeled);

		this.width = function(){return 2*handleSize};		
		this.value = function() {return parameter.value};
		this.name = function() {return  parameter.name};
		this.id = function() {return parameter.id};
		
		this.update = function(a) { if ("function" === typeof a) {update = a; return this} else { update(a) }};
}

exports.button = function(p){
	var parameter = p,
		size = 10,
		innersize = 8,
		shape = "round",
		update = function(x){};

		this.parameter = getset(parameter);
		this.size = getset(size);
		this.innersize = getset(innersize);
		this.shape = getset(shape);

		this.name = function() {return  parameter.name};
		this.id = function() {return parameter.id};
		this.value = function() {return parameter.value};
		this.actions = function() {return parameter.actions};
		this.update = function(a) { if ("function" === typeof a) {update = a; return this} else { update(a) }};
}

exports.slider = function(p){
	
	var parameter = p,
		width = 100,
		handleSize = 8,
		trackSize = 5,
		trackBorder = 0.5,
		labeled = true, 
		update = function(x){};
	
	this.parameter = getset(parameter);

	this.handleSize = getset(handleSize);
	this.trackSize = getset(trackSize);
	this.trackBorder = getset(trackBorder);
	this.labeled = getset(labeled);
	this.width = getset(width);
	this.range = function() {return parameter.range};
	this.value = function() {return parameter.value};
	this.name = function() {return  parameter.name};
	this.id = function() {return parameter.id};
	
	this.update = function(a) { if ("function" === typeof a) {update = a; return this} else { update(a) }};
}

exports.radio = function (p){
var parameter = p,
	size = 200,
	buttonsize = 20,
	buttoninnersize = 12,
	fontsize = 12,
	padding = 5,
	alignment = "vertical",
	shape = "rect",
	update = function(x){};
	
	this.parameter = getset(parameter);
	this.size = getset(size);
	this.fontsize = getset(fontsize);
	this.buttonsize = getset(buttonsize);
	this.alignment = getset(alignment);
	this.buttoninnersize = getset(buttoninnersize);
	this.shape = getset(shape);
	this.padding = getset(padding);
	
	this.name = function() {return  parameter.name};
	this.id = function() {return parameter.id};
	this.value = function() {return parameter.value};
	this.choices = function() {return parameter.choices};	
	
	this.update = function(a) { if ("function" === typeof a) {update = a; return this} else { update(a) }};
}

exports.block = function(blocks,size,gap,t){
	var type;
	var x0;
	var n = blocks.length;
	var N = d3.sum(blocks);
	var white = size - (n-1) * gap;
	var sigma = Array(blocks[0]).fill(0);
	var i = 0;
	while(i++<(n-1)){ sigma = sigma.concat( Array(blocks[i]).fill(i)) }



	if (typeof t === "undefined") {type = "()"} else (type=t);

	switch (type){
		case "()":
//			N += 1;
			x0 = 0.5;
			break;
		case "(]":
			x0 = 1;
			break;
		case "[)":
			x0 = 0;
			break;
		case "[]":
			x0 = 0;
			N -= 1;
			break;
		default:		
				
	}
	
	var dx = white / N;	
	
	this.x = function(n){return  dx * x0 + n * dx + gap * sigma[n]}
}

// helper functions

function getset(arg){
	return function(a) { if ("undefined" === typeof a) {return arg } else {arg = a; return this }};
}

exports.symbol = symbol;

function symbol(type,scale){
	
	if (typeof scale === "undefined") {scale = 100}
	
	switch (type) {
	case "play":
		return function() {
				var p = d3.path();
				p.moveTo(scale * 1, scale * 0);
				p.lineTo(scale * (-0.5), scale * (Math.sqrt(3) / 2))
				p.lineTo(scale * (-0.5), scale * ( - Math.sqrt(3) / 2))
				p.closePath();
	
				return p.toString();
			}	
			break;
	case "back":
		return function() {
				var p = d3.path();
				p.moveTo( - scale * 1, scale * 0);
				p.lineTo(scale * (0.5), scale * (Math.sqrt(3) / 2))
				p.lineTo(scale * (0.5), scale * ( - Math.sqrt(3) / 2))
				p.closePath();

				return p.toString();
			}	
				break;		
	case "pause":
			return function() {
					var g = 1 / 3;
					var p = d3.path();
					var c = 0.9
					p.moveTo(scale * c, scale * c);
					p.lineTo(scale * c, scale * (-c))
					p.lineTo(scale * (c * g), scale * ( - c))
					p.lineTo(scale * (c * g), scale * (  c))
					p.closePath();
		
					p.moveTo(- scale * c, scale * c);
					p.lineTo(- scale * c, scale * (-c))
					p.lineTo(- scale * (c * g), scale * ( - c))
					p.lineTo(- scale * (c * g), scale * (  c))
					p.closePath();
		
	
					return p.toString();
				};
				break;
		case "reload":
			return function() {
		
					var theta = Math.PI/2.5;
					var theta1 = theta / 2;
					var theta0 = 2*Math.PI - theta / 2;
					var width = 0.5;
					var arrow_width = 0.6;
					var arrow_height = 0.6;
		
					var p = d3.path();
		
					p.moveTo(scale * Math.cos (theta0), scale * Math.sin(theta0));
					p.arc(0,0,scale,theta0,theta1,true);
					p.lineTo(scale *(1-width) * Math.cos (theta1), scale *(1-width) * Math.sin (theta1))
					p.arc(0,0,scale * (1-width),theta1,theta0,false);
					p.lineTo(scale * (1 - arrow_width - width / 2 ) * Math.cos(theta0), scale * (1 - arrow_width - width / 2  ) * Math.sin(theta0))
		
					var w0 = [scale *(1 - width / 2) * Math.cos(theta0),scale * (1 - width / 2) * Math.sin(theta0)]
					var z = [scale * arrow_height * Math.cos(theta0+Math.PI / 2), scale * arrow_height * Math.sin(theta0+Math.PI / 2)] 
		
					p.lineTo(w0[0]+z[0], w0[1]+z[1])
					p.lineTo(scale * (1 + arrow_width - width / 2  ) * Math.cos(theta0), scale * (1 + arrow_width - width / 2 ) * Math.sin(theta0))
		
		
		
					p.closePath();
		
	
					return p.toString();
				};
				break;
		case "stop":
				return 	function() {
		var p = d3.path();
		var c = 0.9
		p.moveTo(scale * c, scale * c);
		p.lineTo(scale *(-c), scale * c)
		p.lineTo(scale * (-c), scale * ( - c))
		p.lineTo(scale * (c), scale * ( - c))
		p.closePath();
	
		return p.toString();
	}	;
	break;
	default:
		return function(){
			var p = d3.path();
			p.arc(0,0,scale,0,2*Math.PI,true);
			p.closePath();
			return p.toString();
		};
		
					
	}
}

})(this.widget = {})

