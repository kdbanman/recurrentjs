var learnIntervalId = null;
var weightsComponent = null;
$(function () {

  var reinitLearningRateSlider = function () {
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
  };

  var reinitializeUI = function () {
    reinit();
    reinitLearningRateSlider();
  };

  var learnOnce = function () {
    tick();
    weightsComponent.render();
  };

  var isLearning = function () {
    return learnIntervalId != null;
  };

  var startLearning = function () {
    if(!isLearning()) {
      learnIntervalId = setInterval(learnOnce, 0);
    }
  };

  var stopLearning = function () {
    if(isLearning()) {
      clearInterval(learnIntervalId);
    }
    learnIntervalId = null;
  };

  $('#js-reinitialize_weights').click(function () {
    stopLearning();
    reinitializeUI();
    weightsComponent.setNewModel(model);
  });
  $('#js-train_once').click(learnOnce);
  $('#js-pause_training').click(stopLearning);
  $("#js-train_continuously").click(startLearning);

  $("#sample_network").click(function () {
    var shouldRestart = isLearning();
    stopLearning();

    $('#hot_samples .generated_sample').last().remove();
    var generatedSentence = sampleNetwork();
    var generatedSentenceDiv = '<div class="generated_sample">'+generatedSentence+'</div>'
    $('#hot_samples').prepend(generatedSentenceDiv);

    $('#argmax_samples .generated_sample').last().remove();
    var argmaxGeneratedSentence = sampleNetworkGreedy();
    var argmaxGeneratedSentenceDiv = '<div class="generated_sample">'+argmaxGeneratedSentence+'</div>'
    $('#argmax_samples').prepend(argmaxGeneratedSentenceDiv);

    if (shouldRestart) {
      startLearning();
    }
  });

  $("#temperature_slider").slider({
    min: -1,
    max: 1.05,
    step: 0.05,
    value: 0,
    slide: function (_, ui) {
      sampleSoftmaxTemperature = Math.pow(10, ui.value);
      $("#temperature_text").text( sampleSoftmaxTemperature.toFixed(2) );
    }
  });

  // MAIN ENTRY POINT
  // Initialize the network
  reinitializeUI();
  weightsComponent = new WeightsComponent({
    model: model,
    parentElement: $('#js-weights_visualization')
  });

  $("#diff_track_sensitivity_slider").slider({
    min: Math.log10(0.01) - 3.0,
    max: Math.log10(0.01) + 5,
    step: 0.05,
    value: Math.log10(weightsComponent.diffTrackSensitivity),
    slide: function (_, ui) {
      weightsComponent.diffTrackSensitivity = Math.pow(10, ui.value);
      $("#diff_track_sensitivity_slider_value").text(weightsComponent.diffTrackSensitivity.toFixed(5));
    }
  });
  $("#diff_track_sensitivity_slider_value").text(weightsComponent.diffTrackSensitivity.toFixed(5));
});
