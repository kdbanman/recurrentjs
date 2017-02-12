
// prediction params
var sampleSoftmaxTemperature = 1.0; // how peaky model predictions should be
var maxGenerationLength = 100; // max length of generated sentences

// various global var inits
var epochSize = -1;
var inputSize = -1;
var outputSize = -1;
var letterToIndex = {};
var indexToLetter = {};
var vocabulary = [];
var training_data_lines = [];
var solver = new R.Solver();
var perplexityGraph = new Rvis.Graph();

var model = {};

var initializeVocabulary = function (sents, count_threshold) {
  // go over all characters and keep track of all unique ones seen
  var txt = sents.join(''); // concat all

  // count up all characters
  var d = {};
  for(var i=0,n=txt.length;i<n;i++) {
    var txti = txt[i];
    if(txti in d) { d[txti] += 1; }
    else { d[txti] = 1; }
  }

  // filter by count threshold and create pointers
  letterToIndex = {};
  indexToLetter = {};
  vocabulary = [];
  // NOTE: start at one because we will have START and END tokens!
  // that is, START token will be index 0 in model letter vectors
  // and END token will be index 0 in the next character softmax
  var q = 1;
  for(ch in d) {
    if(d.hasOwnProperty(ch)) {
      if(d[ch] >= count_threshold) {
        // add character to vocabulary
        letterToIndex[ch] = q;
        indexToLetter[q] = ch;
        vocabulary.push(ch);
        q++;
      }
    }
  }

  // globals written: indexToLetter, letterToIndex, vocabulary (list), and:
  inputSize = vocabulary.length + 1;
  outputSize = vocabulary.length + 1;
  epochSize = sents.length;
  $("#preprocessing_results").text('found ' + vocabulary.length + ' distinct characters: ' + vocabulary.join(''));
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

  perplexity_list = [];
  tick_iter = 0;

  // process the input, filter out blanks
  var training_data_lines_raw = $('#training_data').val().split('\n');
  training_data_lines = [];
  for(var i=0;i<training_data_lines_raw.length;i++) {
    var sent = training_data_lines_raw[i].trim();
    if(sent.length > 0) {
      training_data_lines.push(sent);
    }
  }

  initializeVocabulary(training_data_lines, 1); // takes count threshold for characters
  model = initModel();
}

var forwardIndex = function (G, model, ix, prev) {
  var x = G.rowPluck(model['Wil'], ix);
  // forward prop the sequence learner
  if(generator === 'rnn') {
    var out_struct = R.forwardRNN(G, model, hidden_sizes, x, prev);
  } else {
    var out_struct = R.forwardLSTM(G, model, hidden_sizes, x, prev);
  }
  return out_struct;
}

var predictSentence = function (model, samplei, temperature) {
  if(typeof samplei === 'undefined') { samplei = false; }
  if(typeof temperature === 'undefined') { temperature = 1.0; }

  var G = new R.Graph(false);
  var s = '';
  var prev = {};
  while(true) {

    // RNN tick
    var ix = s.length === 0 ? 0 : letterToIndex[s[s.length-1]];
    var lh = forwardIndex(G, model, ix, prev);
    prev = lh;

    // sample predicted letter
    logprobs = lh.o;
    if(temperature !== 1.0 && samplei) {
      // scale log probabilities by temperature and renormalize
      // if temperature is high, logprobs will go towards zero
      // and the softmax outputs will be more diffuse. if temperature is
      // very low, the softmax outputs will be more peaky
      for(var q=0,nq=logprobs.w.length;q<nq;q++) {
        logprobs.w[q] /= temperature;
      }
    }

    probs = R.softmax(logprobs);
    if(samplei) {
      var ix = R.samplei(probs.w);
    } else {
      var ix = R.maxi(probs.w);
    }

    if(ix === 0) break; // END token predicted, break out
    if(s.length > maxGenerationLength) { break; } // something is wrong

    var letter = indexToLetter[ix];
    s += letter;
  }
  return s;
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
    var ix_source = i === -1 ? 0 : letterToIndex[sent[i]]; // first step: start with START token
    var ix_target = i === n-1 ? 0 : letterToIndex[sent[i+1]]; // last step: end with END token

    lh = forwardIndex(G, model, ix_source, prev);
    prev = lh;

    // set gradients into logprobabilities
    logprobs = lh.o; // interpret output as logprobs
    probs = R.softmax(logprobs); // compute the softmax probabilities

    log2perplexity += -Math.log2(probs.w[ix_target]); // accumulate base 2 log prob and do smoothing
    cost += -Math.log(probs.w[ix_target]);

    // write gradients into log probabilities
    logprobs.dw = probs.w;
    logprobs.dw[ix_target] -= 1
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

var sampleNetwork = function () {
  return predictSentence(model, true, sampleSoftmaxTemperature);
}

var sampleNetworkGreedy = function () {
  return predictSentence(model, false);
}

var perplexity_list = [];
var tick_iter = 0;
var tick = function () {

  // sample sentence fromd data
  var sentix = R.randi(0,training_data_lines.length);
  var sent = training_data_lines[sentix];

  var t0 = +new Date();  // log start timestamp

  // evaluate cost function on a sentence
  var cost_struct = costfun(model, sent);

  // use built up graph to compute backprop (set .dw fields in mats)
  cost_struct.G.backward();
  // perform param update
  var solver_stats = solver.step(model, learning_rate, regc, clipval);

  var t1 = +new Date();
  var tick_time = t1 - t0;

  perplexity_list.push(cost_struct.perplexity); // keep track of perplexity

  // evaluate now and then
  tick_iter += 1;
  if(tick_iter % 10 === 0) {
    // keep track of perplexity
    $('#epoch').text('epoch: ' + (tick_iter/epochSize).toFixed(2));
    $('#last_tick_perplexity').text('perplexity: ' + cost_struct.perplexity.toFixed(2));
    $('#time_per_tick').text('forw/bwd time per example: ' + tick_time.toFixed(1) + 'ms');

    if(tick_iter % 100 === 0) {
      var median_perplexity = median(perplexity_list);
      perplexity_list = [];
      perplexityGraph.add(tick_iter, median_perplexity);
      perplexityGraph.drawSelf(document.getElementById("perplexity_graph"));
    }
  }
}
