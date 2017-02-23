
var WeightsComponent = function (options) {

  this.pixelHeight = options.pixelHeight || 5;
  this.pixelWidth = options.pixelWidth || 5;

  this.zoomPixelHeight = options.zoomPixelHeight || 20;
  this.zoomPixelWidth = options.zoomPixelWidth || 20;

  this.positiveActivationHue = options.positiveActivationHue || 190;
  this.negativeActivationHue = options.negativeActivationHue || 6;
  this.positiveActivationSaturation = options.positiveActivationSaturation || 100;
  this.negativeActivationSaturation = options.negativeActivationSaturation || 70;
  this.fullActivationBrightness = options.fullActivationBrightness || 70;

  this.showDiffs = options.showDiffs || false;
  this.diffTrackDecayRate = options.diffTrackDecayRate || 0.95;
  this.diffTrackSensitivity = options.diffTrackSensitivity || 100.0;

  this.parentElement = options.parentElement;
  this.zoomElement = options.zoomElement;

  this.setNewModel(options.model);
}

WeightsComponent.prototype = {
  setNewModel: function (model) {
    var self = this;
    self.model = model;

    if (self.keys) {
      self.keys.forEach(function (key) {
        self.canvases[key].remove();
        self.diffTrackingMats[key] = undefined;
        self.oldMats[key] = undefined;
      });

      self.zoomCanvas.remove();
    }

    self.canvases = {};
    self.diffTrackingMats = {};
    self.oldMats = {};
    self.keys = Object.keys(self.model);

    self.keys.forEach(function (key) {
      var mat = self.model[key];
      self.diffTrackingMats[key] = new R.Mat(mat.n, mat.d);
      self.oldMats[key] = new R.Mat(mat.n, mat.d);

      var rowCount = mat.n;
      var colCount = mat.d;

      var canvas = document.createElement('canvas');
      canvas.height = rowCount * self.pixelHeight;
      canvas.width = colCount * self.pixelWidth;
      canvas.onmouseenter = function (evt) {
        self.zoomedKey = key;
        self.renderZoomCanvas();
      };

      self.parentElement.append(canvas);

      self.canvases[key] = canvas;
    });

    self.zoomCanvas = document.createElement('canvas');
    self.zoomElement.append(self.zoomCanvas);
    self.zoomedKey = self.keys[0];

    this.render();
  },
  render: function () {
    var self = this;
    this.keys.forEach(function (key) {
      self.renderMat(key, self.canvases[key], self.pixelWidth, self.pixelHeight);
      self.renderZoomCanvas();

      for (var i = 0; i < self.diffTrackingMats[key].w.length; i++) {
        self.diffTrackingMats[key].w[i] *= self.diffTrackDecayRate;
      }

      self.oldMats[key] = self.model[key].clone();
    });

  },
  renderMat: function(key, canvas, pixelWidth, pixelHeight) {
    var self = this;

    var mat = self.model[key];
    var oldMat = self.oldMats[key];
    var ctx = canvas.getContext('2d');

    var minmaxWeightIndices = R.minmaxi(mat.w);
    var minWeight = mat.w[minmaxWeightIndices[0]];
    var maxWeight = mat.w[minmaxWeightIndices[1]];

    var weightDiffMat, maxWeightDiff;
    var G = new R.Graph(false);
    weightDiffMat = G.sub(oldMat, mat);
    weightDiffMat = G.eltmul(weightDiffMat, weightDiffMat);

    self.diffTrackingMats[key] = G.add(weightDiffMat, self.diffTrackingMats[key]);

    var maxWeightDiffIndex = R.maxi(weightDiffMat.w);
    maxWeightDiff = Math.max(weightDiffMat.w[maxWeightDiffIndex], self.diffTrackSensitivity);

    for (var row = 0; row < mat.n; row++) {
      for (var col = 0; col < mat.d; col++) {
        var weight = mat.get(row, col);

        ctx.fillStyle = self.getActivationColor(minWeight, maxWeight, weight);
        ctx.fillRect(col * pixelWidth, row * pixelHeight, pixelWidth, pixelHeight);

        if (self.showDiffs) {
          var weightDiff = self.diffTrackingMats[key].get(row, col);

          ctx.fillStyle = self.getFocusColor(0, maxWeightDiff, weightDiff);
          ctx.fillRect(col * pixelWidth, row * pixelHeight, pixelWidth, pixelHeight);
        }
      }
    }
  },
  renderZoomCanvas: function () {
    var self = this;
    var zoomSourceCanvas = self.canvases[self.zoomedKey];
    self.zoomCanvas.width = zoomSourceCanvas.width * Math.round(self.zoomPixelWidth / self.pixelWidth);
    self.zoomCanvas.height = zoomSourceCanvas.height * Math.round(self.zoomPixelHeight / self.pixelHeight);

    self.renderMat(self.zoomedKey, self.zoomCanvas, self.zoomPixelWidth, self.zoomPixelHeight);
  },
  getActivationColor: function (min, max, value) {
    var hue, saturation, lightness;
    if (value < 0) {
      hue = this.negativeActivationHue;
      saturation = this.negativeActivationSaturation;
    } else {
      hue = this.positiveActivationHue;
      saturation = this.negativeActivationSaturation;
    }

    if (min * max > 0) {
      // signs are the same.
      lightness = this.fullActivationBrightness * (max - value) / (max - min);
    } else {
      // signs differ: min is negative and max is positive.
      var maxDisplacement = max > -1 * min ? max : -1 * min;
      var absoluteValue = value > 0 ? value : -1 * value;
      lightness = this.fullActivationBrightness * absoluteValue / maxDisplacement;
    }

    // round to nearest tenth
    lightness = Math.round(lightness * 10) / 10;

    return 'hsl(' + hue + ',' + saturation + '%,' + lightness + '%)';
  },
  getFocusColor: function (min, max, value) {
    var fraction = (value - min) / (max - min);

    // round to nearest tenth
    var alphaVal = Math.round(20 * fraction) / 10;
    return 'rgba(255,255,255,' + alphaVal + ')';
  }
}


var GenerationComponent = function (options) {
  this.sampleCount = options.sampleCount || 8;

  this.inspectorPixelSize = options.inspectorPixelSize || 15;
  this.smallGapSize = options.smallGapSize || 5;
  this.largeGapSize = options.largeGapSize || 25;

  this.distributionElement = options.distributionElement;
  this.argmaxElement = options.argmaxElement;
  this.inspectorElement = options.inspectorElement;
  this.inspectorFader = options.inspectorFader;

  this.inspectorFader.hide();

  for (var i = 0; i < this.sampleCount; i++) {
    var distributionSampleElement = this.newGeneratedSampleElement();
    var argmaxSampleElement = this.newGeneratedSampleElement();

    this.distributionElement.append(distributionSampleElement);
    this.argmaxElement.append(argmaxSampleElement)
  }
}

GenerationComponent.prototype = {
  addDistributionSample: function (networkHistory) {
    this.cycleSampleCollection(this.distributionElement, networkHistory)
  },
  addArgmaxSample: function (networkHistory) {
    this.cycleSampleCollection(this.argmaxElement, networkHistory)
  },
  cycleSampleCollection: function (collectionElement, networkHistory) {
    collectionElement.children().last().remove()
    collectionElement.prepend(this.newGeneratedSampleElement(networkHistory));
  },
  newGeneratedSampleElement: function (networkHistory) {
    var self = this;

    var sequenceString = networkHistory == null ? "---" : networkHistory.sentence;

    var sampleElement = $.parseHTML('<li class="list-group-item generated_sample"><samp>' + sequenceString + '</samp></li>');

    if (networkHistory != null) {
      var inspectorCanvas = self.renderSampleInspection(networkHistory);

      $(sampleElement).mouseenter(function (evt) {
        self.inspectorElement.children().remove();
        self.inspectorElement.append(inspectorCanvas);

        self.inspectorFader.height(inspectorCanvas.height);
        self.inspectorFader.show();
      });
    }
    return sampleElement;
  },
  newBlankSampleArray: function (length) {
    return Array.apply(null, Array(length)).map(function () {});
  },
  renderSampleInspection: function (networkHistory) {
    var self = this;

    var tmpInspectorCanvas = document.createElement('canvas');

    tmpInspectorCanvas.width = 5000;
    tmpInspectorCanvas.height = 5000;

    var ctx = tmpInspectorCanvas.getContext("2d");

    var currentX = 0;

    var maxX = 0;
    var maxY = 0;

    // count to <= length so that the last character is rendered after the last state history entry
    for (var stateIdx = 0; stateIdx <= networkHistory.internalStateHistory.length; stateIdx++) {
      var currentY = 0;

      if (stateIdx != 0) {
        var character = networkHistory.sentence[stateIdx - 1];

        // TODO render character

        if (stateIdx == networkHistory.internalStateHistory.length) {
          break;
        }
      }
      currentY += self.inspectorPixelSize;
      currentY += self.largeGapSize;

      var internalState = networkHistory.internalStateHistory[stateIdx];

      currentY = self.renderActivationLayers(internalState.h, ctx, currentX, currentY);

      if (internalState.c != null) {
        currentY = self.renderActivationLayers(internalState.c, ctx, currentX, currentY);
      }

      currentY = self.renderActivations(internalState.o.w, ctx, currentX, currentY);

      currentX += self.inspectorPixelSize;

      maxX = Math.max(maxX, currentX);
      maxY = Math.max(maxY, currentY);
    }

    var inspectorCanvas = document.createElement('canvas');
    inspectorCanvas.width = maxX + self.inspectorPixelSize;
    inspectorCanvas.height = maxY + self.inspectorPixelSize;

    var inspectorCtx = inspectorCanvas.getContext("2d");
    inspectorCtx.drawImage(tmpInspectorCanvas, 0, 0);

    return inspectorCanvas;
  },
  renderActivationLayers: function(layers, ctx, currentX, currentY) {
    var self = this;
    for (var layerIdx = 0; layerIdx < layers.length; layerIdx++) {
      currentY = self.renderActivations(layers[layerIdx].w, ctx, currentX, currentY);
    }

    currentY += self.largeGapSize;
    return currentY;
  },
  renderActivations: function (layerActivations, ctx, currentX, currentY) {
    var self = this;
    for (var activationIdx = 0; activationIdx < layerActivations.length; activationIdx++) {
      ctx.fillStyle = "#" + ('00000'+(Math.random()*(1<<24)|0).toString(16)).slice(-6);
      ctx.fillRect(currentX, currentY, self.inspectorPixelSize, self.inspectorPixelSize);

      currentY += self.inspectorPixelSize;
    }

    currentY += self.smallGapSize;
    return currentY;
  }
}
