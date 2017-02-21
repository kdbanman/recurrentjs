
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

var reinitGlobals = function () {
  generator = $("#useLSTM").is(":checked") ? "lstm" : "rnn";

  hidden_sizes = eval($("#hidden_layer_sizes").val());

  learning_rate = Math.pow(10, $("#learning_rate_slider").slider("getValue"));
  letter_size = $("#letter_embedding_size_slider").slider("getValue");
  regc = Math.pow(10, $("#regularization_strength_slider").slider("getValue"));
  clipval = $("#letter_embedding_size_slider").slider("getValue");
}
