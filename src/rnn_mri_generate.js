
var generateSentence = function (model, samplei, temperature) {
  if(typeof samplei === 'undefined') { samplei = false; }
  if(typeof temperature === 'undefined') { temperature = 1.0; }

  var G = new R.Graph(false);
  var s = '';
  var prev = {};
  while(true) {

    // RNN tick
    var ix = s.length === 0 ? 0 : characterToIndex[s[s.length-1]];
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

    var letter = indexToCharacter[ix];
    s += letter;
  }
  return s;
}

var sampleNetwork = function () {
  return generateSentence(model, true, sampleSoftmaxTemperature);
}

var sampleNetworkGreedy = function () {
  return generateSentence(model, false);
}
