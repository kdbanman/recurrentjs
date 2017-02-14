
var generateSentence = function (model, samplei, temperature) {
  if (samplei == null) { samplei = false; }
  if (temperature == null) { temperature = 1.0; }

  var G = new R.Graph(false);
  var sentence = '';
  var previousNetworkOutput = {};
  while(true) {

    // RNN tick
    var indexCurrent = sentence.length === 0 ? 0 : characterToIndex[sentence[sentence.length-1]];
    var currentNetworkOutput = forwardPropagateNetwork(G, model, indexCurrent, previousNetworkOutput);
    previousNetworkOutput = currentNetworkOutput;

    // sample predicted letter
    var logProbabilities = currentNetworkOutput.o;
    if(temperature !== 1.0 && samplei) {
      // scale log probabilities by temperature and renormalize
      // if temperature is high, logProbabilities will go towards zero
      // and the softmax outputs will be more diffuse. if temperature is
      // very low, the softmax outputs will be more peaky
      for(var q=0,nq=logProbabilities.w.length;q<nq;q++) {
        logProbabilities.w[q] /= temperature;
      }
    }

    probs = R.softmax(logProbabilities);
    if(samplei) {
      var indexCurrent = R.samplei(probs.w);
    } else {
      var indexCurrent = R.maxi(probs.w);
    }

    if(indexCurrent === 0) break; // END token predicted, break out
    if(sentence.length > maxGenerationLength) { break; } // something is wrong

    var letter = indexToCharacter[indexCurrent];
    sentence += letter;
  }
  return sentence;
}

var sampleNetwork = function () {
  return generateSentence(model, true, sampleSoftmaxTemperature);
}

var sampleNetworkGreedy = function () {
  return generateSentence(model, false);
}
