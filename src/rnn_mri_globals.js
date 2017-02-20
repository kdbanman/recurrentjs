
// network and optimizer
var model = {};
var solver = new R.Solver();

// network vocabulary and vocab maps
var characterToIndex = {};
var indexToCharacter = {};
var vocabulary = [];

// network i/o vector sizes
var inputSize = -1;
var outputSize = -1;

// prediction params
var sampleSoftmaxTemperature = 1.0; // how peaky model predictions should be
var maxGenerationLength = 100; // max length of generated sentences

// training data and stats
var trainingDataLines = [];
var epochSize = -1;

// historical state and graph
var perplexityGraph = new Rvis.Graph();
var perplexityHistory = [];
var currentTick = 0;
