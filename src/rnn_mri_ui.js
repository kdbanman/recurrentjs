
$(function () {
  var learnIntervalId = null;
  var weightsComponent = null;
  var learnCountSinceRender = 0;
  var renderPeriod = 1;

  var reinitLearningRateSlider = function () {
    // note that learning_rate is a global variable
    $("#learning_rate_slider").slider({
      min: Math.log10(0.01) - 3.0,
      max: Math.log10(0.01) + 0.05,
      step: 0.05,
      value: Math.log10(learning_rate),
      formatter: function (value) {
        return Math.pow(10, value).toPrecision(3);
      }
    }).on("slide", function (evt) {
      learning_rate = Math.pow(10, evt.value);
    })
  };

  var reinitializeUI = function () {
    reinitGlobals();
    reinit();
    reinitLearningRateSlider();
    perplexityGraph = new Rvis.Graph();
    perplexityGraph.drawSelf(document.getElementById("perplexity_graph"));

    learnCountSinceRender = 0;
  };

  var learnOnce = function () {
    var tick_time = tick();
    learnCountSinceRender++;

    if (learnCountSinceRender >= renderPeriod) {
      learnCountSinceRender = 0;

      weightsComponent.render();

      var median_perplexity = median(perplexityHistory);
      perplexityGraph.add(currentTick, median_perplexity);
      perplexityGraph.drawSelf(document.getElementById("perplexity_graph"));

      $('#epoch').text((currentTick / epochSize).toFixed(2));
      $('#last_tick_perplexity').text(perplexityHistory[perplexityHistory.length - 1].toFixed(2));
      $('#time_per_tick').text(tick_time.toFixed(1) + 'ms');
      perplexityHistory = [];
    }
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
    var generatedSentenceDiv = '<div class="generated_sample"><samp>'+generatedSentence+'</samp></div>'
    $('#hot_samples').prepend(generatedSentenceDiv);

    $('#argmax_samples .generated_sample').last().remove();
    var argmaxGeneratedSentence = sampleNetworkGreedy();
    var argmaxGeneratedSentenceDiv = '<div class="generated_sample"><samp>'+argmaxGeneratedSentence+'</samp></div>'
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
    formatter: function (value) {
      return Math.pow(10, value).toPrecision(3);
    }
  }).on("slide", function (evt) {
    sampleSoftmaxTemperature = Math.pow(10, evt.value);
  });

  // MAIN ENTRY POINT
  // Initialize the network
  reinitializeUI();
  weightsComponent = new WeightsComponent({
    model: model,
    parentElement: $('#js-weights_visualization'),
    zoomElement: $('#js-weights_visualization_zoom'),
    pixelHeight: 4,
    pixelWidth: 4,
    zoomPixelHeight: 8,
    zoomPixelWidth: 8,
  });

  $("#diff_track_toggle").slider({
    min: 0,
    max: 1,
    ticks: [0, 1],
    step: 1,
    value: 0,
    formatter: function (value) {
      return value === 1 ? "On" : "Off";
    }
  }).change(function (evt) {
    weightsComponent.showDiffs = evt.target.value === "1";
  });

  $("#diff_track_sensitivity_slider").slider({
    min: Math.log10(0.01) - 3.0,
    max: Math.log10(0.01) + 4,
    step: 0.05,
    value: Math.log10(weightsComponent.diffTrackSensitivity),
    formatter: function (value) {
      return Math.pow(10, value).toPrecision(3);
    }
  }).on("slide", function (evt) {
    weightsComponent.diffTrackSensitivity = Math.pow(10, evt.value);
  });

  $("#render_period_slider").slider({
    min: 1,
    max: 100,
    step: 1,
    value: 1,
  }).on("slide", function (evt) {
    renderPeriod = evt.value;
  });
});
