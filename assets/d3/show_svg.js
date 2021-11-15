function show_svg_code()
{
		var svg = document.getElementsByTagName("svg")[0];
		var svg_xml = (new XMLSerializer).serializeToString(svg);
		var myWindow = window.open("", "MsgWindow", "width=1000,height=1000");
		var l = document.getElementsByTagName("link")[0];
		var l_xml = (new XMLSerializer).serializeToString(l);
		myWindow.document.write(l_xml);
				myWindow.document.write(svg_xml);
	
}
