import { TransformationMap as TopicVisualization, EDIT_MODE, VIEW_MODE, NO_LOGO } from '../modules/topic.js';
import { TopicData } from '../modules/data.js';

// props
var topic = TopicData['a1Gb0000000pjsvEAA'];
var isEditing = false;
var selectedInnerNode = null;
var keyIssues = 'a1Gb00000015QOaEAM';
// var image = null;


var handleSelectInnerNode = function(innerNode) {
    console.log('handleSelectInnerNode', innerNode);

    selectedInnerNode = innerNode;
    topicVisualization
        .mode(VIEW_MODE)
        .highlight(selectedInnerNode.id, false);
}

var handleRemoveInnerNode = function(innerNode) {
    console.log('handleRemoveInnerNode', innerNode);
}

var handleSelectedOuterNode = function(outerNode) {
    console.log('handleSelectedOuterNode', outerNode);

    if (TopicData[outerNode.id]) {
        topic = TopicData[outerNode.id];
        redrawVisualMap();
    } else {
        alert('No data!');
    } 
}

var handleSelectImage = function(imageNode) {
    console.log('handleSelectImage', imageNode);
}

var topicVisualization = new TopicVisualization();

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
        .animationDuration(750)
        .copyrightText(null);
}

var redrawVisualMap = function() {
    initVisualMap();
    topicVisualization.update();
}


initVisualMap();

var svgMain = document.getElementById('svgMain');
topicVisualization.initialise(svgMain);

if (isEditing) {
    topicVisualization
        .mode(EDIT_MODE)
        .onSelectImage(handleSelectImage)
        .onSelectInsightArea(null);
} else {
    topicVisualization
        .mode(VIEW_MODE)
        .onSelectInsightArea(handleSelectedOuterNode)
        .onSelectImage(handleSelectImage)
        .highlight(selectedInnerNode || topic, true);
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