var clearText = 0;
const app = new Vue({
  el: "#app",
  vuetify: new Vuetify(),
  data: {
    textFromCamera: "",
    receptionistReply: null,
    teachableMachineActivated: false,
    doneLoading: false,
    spinnerStarted: false,
  },
  // As soon as reactive events are available
  created: function () {},
  // These are your functions
  methods: {
    passWords: function (words) {
      this.textFromCamera = words;
      this.doneLoading = true;
    },
    clear: function () {
      clearText = 1;
    },
    startSpinner: function () {
      this.spinnerStarted = true;
    },
    enableTeachableMachine: function (func) {
      this.teachableMachineActivated = true;
      setTimeout(this.startSpinner, 200);
      this.teachableMachine(func);
    },
    textToSpeech: function () {
      let speech = new SpeechSynthesisUtterance();
      speech.lang = "en";
      voices = window.speechSynthesis.getVoices();
      speech.voice = voices[67];
      speech.speed = 0.2;
      speech.pitch = 0.4;
      speech.text = this.receptionistReply;
      window.speechSynthesis.speak(speech);
    },
    teachableMachine: function (func) {
      // More API functions here:
      // https://github.com/googlecreativelab/teachablemachine-community/tree/master/libraries/pose

      // the link to your model provided by Teachable Machine export panel
      const URL = "./my_model/";
      let model, webcam, ctx, labelContainer, maxPredictions;
      let words = "";
      let checker = "";
      let crossChecker = "";
      let counter = 0;
      let finalWord = "";
      init();

      async function init() {
        const modelURL = URL + "model.json";
        const metadataURL = URL + "metadata.json";

        // load the model and metadata
        // Refer to tmImage.loadFromFiles() in the API to support files from a file picker
        // Note: the pose library adds a tmPose object to your window (window.tmPose)
        model = await tmPose.load(modelURL, metadataURL);
        maxPredictions = model.getTotalClasses();

        // Convenience function to setup a webcam
        const size = 400;
        const flip = true; // whether to flip the webcam
        webcam = new tmPose.Webcam(size, size, flip); // width, height, flip
        await webcam.setup(); // request access to the webcam
        await webcam.play();
        window.requestAnimationFrame(loop);

        // append/get elements to the DOM
        const canvas = document.getElementById("canvas");
        canvas.width = size;
        canvas.height = size;
        ctx = canvas.getContext("2d");
        labelContainer = document.getElementById("label-container");
        for (let i = 0; i < maxPredictions; i++) {
          // and class labels
          labelContainer.appendChild(document.createElement("div"));
        }
      }

      async function loop(timestamp) {
        webcam.update(); // update the webcam frame
        await predict();
        window.requestAnimationFrame(loop);
      }

      async function predict() {
        // Prediction #1: run input through posenet
        // estimatePose can take in an image, video or canvas html element
        const { pose, posenetOutput } = await model.estimatePose(webcam.canvas);
        // Prediction 2: run input through teachable machine classification model
        const prediction = await model.predict(posenetOutput);

        for (let i = 0; i < maxPredictions; i++) {
          if (clearText === 1) {
            words = "";
            checker = "";
            crossChecker = "";
            counter = 0;
            clearText = 0;
          }
          if (
            prediction[i].probability > 0.9 &&
            words !== "" &&
            prediction[i].className !== "stop" &&
            prediction[i].className !== crossChecker &&
            prediction[i].className !== "Hello." &&
            finalWord !== "final"
          ) {
            if (checker === "Hello.") {
              counter++;
              checker = prediction[i].className;
            } else {
              if (prediction[i].className === checker) {
                counter++;
                if (counter > 3) {
                  words = words + prediction[i].className + " ";
                  checker = "Hello.";
                  counter = 0;
                  crossChecker = prediction[i].className;
                  var audio;
                  if (prediction[i].className.slice(-1) === "?") {
                    audio = new Audio(
                      prediction[i].className.slice(0, -1) + ".mp3"
                    );
                  } else {
                    audio = new Audio(prediction[i].className + ".mp3");
                  }
                  audio.play();
                }
              } else {
                counter = 0;
                checker = "Hello.";
              }
            }
          } else if (
            prediction[i].probability > 0.9 &&
            prediction[i].className === "Hello." &&
            words === "" &&
            finalWord !== "final"
          ) {
            words = words + prediction[i].className + " ";
            checker = prediction[i].className;
            var audio = new Audio(prediction[i].className + ".mp3");
            audio.play();
          } else if (
            prediction[i].probability > 0.9 &&
            prediction[i].className === "stop" &&
            finalWord !== "final"
          ) {
            words = "";
            checker = "";
            crossChecker = "";
            counter = 0;
          } else if (
            prediction[i].probability > 0.9 &&
            prediction[i].className === "final"
          ) {
            finalWord = "final";
            words = "";
            checker = "";
            crossChecker = "";
            counter = 0;
          }
          func(words);
        }

        // finally draw the poses
        drawPose(pose);
      }

      function drawPose(pose) {
        if (webcam.canvas) {
          ctx.drawImage(webcam.canvas, 0, 0);
          // draw the keypoints and skeleton
          if (pose) {
            const minPartConfidence = 0.5;
            tmPose.drawKeypoints(pose.keypoints, minPartConfidence, ctx);
            tmPose.drawSkeleton(pose.keypoints, minPartConfidence, ctx);
          }
        }
      }
    },
  },
  // Watch for changes
  watch: {},
});

Vue.use(Vuetify);
