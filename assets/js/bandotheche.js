import { TransformationMap as TopicVisualization, EDIT_MODE, VIEW_MODE, NO_LOGO } from '../modules/topic.js';
import { restData } from '../modules/rest_data.js';

// props
// var topic = TopicData['a1Gb0000000pjsvEAA'];
var topic = null;
var isEditing = false;
var selectedInnerNode = null;
var keyIssues = 'a1Gb00000015QOaEAM';
// var image = null;

var getNameNode = function(name_node){
    var arr_name_node = name_node.toString().trim().split(' ');
    var name_node_rs = '';
    for(var i=0; i< arr_name_node.length; i++){
        var name = arr_name_node[i];
        name_node_rs += name + ' ';
        if(name_node_rs.length >= 20){
            break;
        }
    }
    if(name_node_rs.trim().length < name_node.toString().trim().length){
        name_node_rs = name_node_rs + '...';
    }
    return name_node_rs;
}

var getDataAsTree = function(nodeId) {
    // root
    var time_spam = new Date().getTime();
    var rootRaw = restData.find(i => i.id === nodeId.split('-')[0]);
    var root = {
        id: rootRaw.id + '-' + time_spam,
        //name: (rootRaw.name || '').substr(0, 20),
        name: getNameNode(rootRaw.name),
        fullname: rootRaw.name,
        //radius_item: rootRaw.radius / 300,
        radius_item: 14,
        image_url: rootRaw.nodeType === 'cp' ? 'https://static.wixstatic.com/media/9d8ed5_64b820680dbe4c408e41f203c994f8b5~mv2.png/v1/fill/w_1000,h_1017,al_c,usm_0.66_1.00_0.01/9d8ed5_64b820680dbe4c408e41f203c994f8b5~mv2.png' : 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/1b/Flag_of_North_Vietnam_%281955%E2%80%931976%29.svg/230px-Flag_of_North_Vietnam_%281955%E2%80%931976%29.svg.png'
    };
    root.dimensions = [];

    // dimensions
    restData.filter(i => i.parentId === root.id.split('-')[0]).forEach(i => {
        root.dimensions.push({
            id: i.id + '-' + time_spam,
            //name: i.nodeType === 'cp' ? i.name : (i.name || '').substr(0, 20),
            name: getNameNode(i.name),
            fullname: i.name,
            //radius_item: i.radius / 300,
            radius_item: 14,
            image_url: ''
        });
    });

    // dimensions
    root.dimensions.forEach(dim => {
        dim.dimensions = restData
                        .filter(i => i.parentId === dim.id.split('-')[0])
                        //.slice(0, 3)
                        .map(i => ({
                            id: i.id + '-' + time_spam,
                            name: getNameNode(i.name),
                            fullname: i.name,
                            //radius_item: i.radius / 300,
                            radius_item: 14,
                            image_url: ''
                        }));
    });

    // RETURN
    return root;
}

var handleSelectInnerNode = function(innerNode) {  
    renderLink(innerNode);
    topic = getDataAsTree(innerNode.id);
    redrawVisualMap();
    
}

var handleRemoveInnerNode = function(innerNode) {
    console.log('handleRemoveInnerNode', innerNode);
}

var handleSelectedOuterNode = function(outerNode) {   
    renderLink(outerNode); 
    topic = getDataAsTree(outerNode.id);
    redrawVisualMap();
}

var handleSelectImage = function(imageNode) {
    console.log('handleSelectImage', imageNode);
}

// const handleSelectInnerNode = (topic) =>
//     setTransformationMapInnerNode({ id: topic.id });

var initVisualMap = function() {
    topicVisualization
    .data(topic)
        .mode(isEditing ? EDIT_MODE : VIEW_MODE)
        //.activeColour(constantColors.blue)
        .activeColour('#437DEF')
        .copyrightLocation(NO_LOGO)
        .onSelectKeyIssue(handleSelectInnerNode)
        .onSelectRemoveKeyIssue(handleRemoveInnerNode)
        /*.onMoveOverKeyIssue(function(node){
            selectedInnerNode = node;
            topicVisualization
            .mode(VIEW_MODE)
            .highlight(selectedInnerNode.id, false);
        })*/
        .animationDuration(750)
        .copyrightText(null);
}

var redrawVisualMap = function() {
    //$('#svgMain').html('');
    initVisualMap();  
    //var svgMain = document.getElementById('svgMain');
    //topicVisualization.initialise(svgMain);  
    topicVisualization.update();
}

const getDimensionsList = function(
    keyIssueList,
    topicDimensionList,
    isEditing,
  ) {
    if (keyIssueList && isEditing) {
      return keyIssueList;
    }
    return topicDimensionList || [];
};

// const list = getDimensionsList(keyIssues, topic.dimensions, isEditing);
// const listNames = list.map(({ id, name }) => `${id}-${name}`).join("_");

// let newData: Partial<MapData> = {
// var newData = {
//     ...topic,
//     dimensions: list,
// };
// if (image) {
//     newData = { ...newData, image_url: image };
// }
// const newTopicData = { ...topic, ...newData };

// topicVisualization.data(newTopicData).highlight(selectedInnerNode || topic, true);
// topicVisualization.update();
var getFullPath = function(id_topic){
    var path = '';
    var data = restData.filter(n => n.id === id_topic.split('-')[0]);
    var item = data[0];
    path = '<a href="#" name="aLink" id_topic="'+item.id+'">'+item.name+'</a>';;
    if(item.parentId == ''){
        return path;
    } else {
        return getFullPath(item.parentId) + '/' + path;
    }
}
var renderLink = function(node){
    //xóa tất cả node cùng cấp và cấp con    
    $('#spLink').html(getFullPath(node.id));
    bindEventLink();
}
var bindEventLink = function(){
    $('a[name="aLink"]').click(function(e){
        var id_topic = $(this).attr('id_topic');        
        e.stopImmediatePropagation();
        topic = getDataAsTree(id_topic);
        redrawVisualMap();
    });
}
//nghiand
var topicVisualization = new TopicVisualization();
var dragging = null;
var initForm = function() {
    topic = getDataAsTree('cp');    
    initVisualMap();
    var svgMain = document.getElementById('svgMain');
    topicVisualization.initialise(svgMain);  
    
    var zoom_handler = d3.zoom().on("zoom", zoom_actions);	
    d3.select('svg').call(zoom_handler)
		.call(zoom_handler.transform, d3.zoomIdentity.translate(d3.select('svg').node().clientWidth/2, d3.select('svg').node().clientHeight/2).scale(1));
}

function zoom_actions() {
    d3.select('svg').select('g').attr("transform", d3.event.transform)
}

initForm();
