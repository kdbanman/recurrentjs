
var initializeVocabulary = function (trainingDataString) {
  // go over all characters and keep track of all unique ones seen

  var characters = {};
  for (var i = 0; i < trainingDataString.length; i++) {
    var character = trainingDataString[i];
    if (!(character in characters)) {
      characters[character] = true;
    }
  }

  characterToIndex = {};
  indexToCharacter = {};
  vocabulary = [];
  // NOTE: start at one because we will have START and END tokens!
  // that is, START token will be index 0 in model letter vectors
  // and END token will be index 0 in the next character softmax
  var characterIndex = 1;
  for (character in characters) {
    if (characters.hasOwnProperty(character)) {
      // add character to vocabulary
      characterToIndex[character] = characterIndex;
      indexToCharacter[characterIndex] = character;
      vocabulary.push(character);
      characterIndex++;
    }
  }

  // globals written: indexToCharacter, characterToIndex, vocabulary (list), and:
  inputSize = vocabulary.length + 1;
  outputSize = vocabulary.length + 1;
  $("#preprocessing_results").text('' + vocabulary.length + ' distinct characters: ' + vocabulary.join(''));
}

var utilAddToModel = function (modelto, modelfrom) {
  for(var k in modelfrom) {
    if(modelfrom.hasOwnProperty(k)) {
      // copy over the pointer but change the key to use the append
      modelto[k] = modelfrom[k];
    }
  }
}

var initModel = function () {
  // letter embedding vectors
  var model = {};
  model['Wil'] = new R.RandMat(inputSize, letter_size , 0, 0.08);

  if(generator === 'rnn') {
    var rnn = R.initRNN(letter_size, hidden_sizes, outputSize);
    utilAddToModel(model, rnn);
  } else {
    var lstm = R.initLSTM(letter_size, hidden_sizes, outputSize);
    utilAddToModel(model, lstm);
  }

  return model;
}

var reinit_learning_rate_slider = function () {
  // init learning rate slider for controlling the decay
  // note that learning_rate is a global variable
  $("#learning_rate_slider").slider({
    min: Math.log10(0.01) - 3.0,
    max: Math.log10(0.01) + 0.05,
    step: 0.05,
    value: Math.log10(learning_rate),
    slide: function (_, ui) {
      learning_rate = Math.pow(10, ui.value);
      $("#learning_rate_slider_value").text(learning_rate.toFixed(5));
    }
  });
  $("#learning_rate_slider_value").text(learning_rate.toFixed(5));
}

var reinit = function () {
  // note: reinit writes global vars

  // eval options to set some globals
  eval($("#js-initialization_code").val());

  reinit_learning_rate_slider();

  solver = new R.Solver(); // reinit solver
  perplexityGraph = new Rvis.Graph();

  perplexityHitory = [];
  currentTick = 0;

  // process the input, filter out blanks
  var trainingDataLines_raw = $('#training_data').val().split('\n');
  trainingDataLines = [];
  for(var i=0;i<trainingDataLines_raw.length;i++) {
    var sent = trainingDataLines_raw[i].trim();
    if(sent.length > 0) {
      trainingDataLines.push(sent);
    }
  }

  epochSize = trainingDataLines.length;
  initializeVocabulary(trainingDataLines.join(''));
  model = initModel();
}

var forwardPropagateNetwork = function (G, model, characterIndex, prev) {
  var inputCharacterVector = G.rowPluck(model['Wil'], characterIndex);
  if(generator === 'rnn') {
    var networkOutput = R.forwardRNN(G, model, hidden_sizes, inputCharacterVector, prev);
  } else {
    var networkOutput = R.forwardLSTM(G, model, hidden_sizes, inputCharacterVector, prev);
  }
  return networkOutput;
}

var costfun = function (model, sent) {
  // takes a model and a sentence and
  // calculates the loss. Also returns the Graph
  // object which can be used to do backprop
  var n = sent.length;
  var G = new R.Graph();
  var log2perplexity = 0.0;
  var cost = 0.0;
  var prev = {};
  for(var i=-1;i<n;i++) {
    // start and end tokens are zeros
    var ix_source = i === -1 ? 0 : characterToIndex[sent[i]]; // first step: start with START token
    var ix_target = i === n-1 ? 0 : characterToIndex[sent[i+1]]; // last step: end with END token

    lh = forwardPropagateNetwork(G, model, ix_source, prev);
    prev = lh;

    // set gradients into logprobabilities
    var logProbabilities = lh.o; // interpret output as logProbabilities
    probs = R.softmax(logProbabilities); // compute the softmax probabilities

    log2perplexity += -Math.log2(probs.w[ix_target]); // accumulate base 2 log prob and do smoothing
    cost += -Math.log(probs.w[ix_target]);

    // write gradients into log probabilities
    logProbabilities.dw = probs.w;
    logProbabilities.dw[ix_target] -= 1
  }
  var perplexity = Math.pow(2, log2perplexity / (n - 1));
  return {'G':G, 'perplexity':perplexity, 'cost':cost};
}

var median = function (values) {
  values.sort( function (a,b) {return a - b;} );
  var half = Math.floor(values.length/2);
  if(values.length % 2) return values[half];
  else return (values[half-1] + values[half]) / 2.0;
}

var tick = function () {

  // sample sentence fromd data
  var sentix = R.randi(0,trainingDataLines.length);
  var sent = trainingDataLines[sentix];

  var t0 = +new Date();  // log start timestamp

  // evaluate cost function on a sentence
  var cost_struct = costfun(model, sent);

  // use built up graph to compute backprop (set .dw fields in mats)
  cost_struct.G.backward();
  // perform param update
  var solver_stats = solver.step(model, learning_rate, regc, clipval);

  var t1 = +new Date();
  var tick_time = t1 - t0;

  perplexityHitory.push(cost_struct.perplexity);

  // evaluate now and then
  currentTick += 1;
  if(currentTick % 10 === 0) {
    // keep track of perplexity
    $('#epoch').text('epoch: ' + (currentTick/epochSize).toFixed(2));
    $('#last_tick_perplexity').text('perplexity: ' + cost_struct.perplexity.toFixed(2));
    $('#time_per_tick').text('forw/bwd time per example: ' + tick_time.toFixed(1) + 'ms');

    if(currentTick % 100 === 0) {
      var median_perplexity = median(perplexityHitory);
      perplexityHitory = [];
      perplexityGraph.add(currentTick, median_perplexity);
      perplexityGraph.drawSelf(document.getElementById("perplexity_graph"));
    }
  }
}
