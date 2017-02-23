
$(function () {


  // UI GLOBALS

  var learnIntervalId = null;
  var weightsComponent = null;
  var generationComponent = null;
  var learnCountSinceRender = 0;
  var renderPeriod = 1;


  // UI FUNCTIONS

  var reinitializeUI = function () {
    reinitGlobals();
    reinit();
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


  // BUTTON CALLBACKS

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

    generationComponent.addDistributionSample(sampleNetwork());
    generationComponent.addArgmaxSample(sampleNetworkGreedy());

    if (shouldRestart) {
      startLearning();
    }
  });


  // HYPERPARAMETER SLIDER DECLARATIONS

  $("#learning_rate_slider").slider({
    min: Math.log10(0.01) - 3.0,
    max: Math.log10(0.01) + 0.05,
    step: 0.05,
    value: Math.log10(0.01),
    formatter: function (value) {
      return Math.pow(10, value).toPrecision(3);
    }
  }).on("slide", function (evt) {
    learning_rate = Math.pow(10, evt.value);
  });

  $("#letter_embedding_size_slider").slider({
    min: 1,
    max: 10,
    step: 1,
    value: 5,
  }).on("slide", function (evt) {
    letter_size = evt.value;
  });

  $("#regularization_strength_slider").slider({
    min: Math.log10(0.01) - 5.0,
    max: Math.log10(0.01) + 0.05,
    step: 0.05,
    value: Math.log10(0.000001),
    formatter: function (value) {
      return Math.pow(10, value).toPrecision(3);
    }
  }).on("slide", function (evt) {
    regc = Math.pow(10, evt.value);
  });

  $("#grad_clip_threshold_slider").slider({
    min: 0.1,
    max: 10,
    value: 5,
    formatter: function (value) {
      return value.toPrecision(2);
    }
  }).on("slide", function (evt) {
    clipval = evt.value;
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
  generationComponent = new GenerationComponent({
    distributionElement: $("#hot_samples"),
    argmaxElement: $("#argmax_samples"),
    inspectorElement: $("#generation_inspector"),
    inspectorFader: $("#generation_inspector_fade_gradient"),
  });

  // VISUALIZATION SLIDER DECLARATIONS

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
});
