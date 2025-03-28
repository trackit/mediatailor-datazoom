(() => {
  const mediatailorSessionURL = "URL"; // Modify
  const mediatailor = datazoom.mediatailor;

datazoom.init({
    configuration_id: "CONFIGURATION_ID" // Modify
});

const palConsentSettings = {
    allowStorage: false
};

const sessionConfig = {
    sessionInitUrl: mediatailorSessionURL,
    palNonceRequestParams: {
        adWillAutoPlay: true,
        adWillPlayMuted: true,
        continuousPlayback: false,
        descriptionUrl: "https://example.com",
        iconsSupported: true,
        playerType: "Sample Player Type",
        playerVersion: "1.0",
        ppid: "12JD92JD8078S8J29SDOAKC0EF230337",
        url: "https://developers.google.com/ad-manager/pal/html5",
        videoHeight: 480,
        videoWidth: 640,
        omidPartnerName: datazoom.omidPartnerName,
        omidPartnerVersion: datazoom.omidPartnerVersion
    },
    incomingAdCountdownInterval: 10
};

const adIconElement = document.getElementById("ad-icon");
const adClickElement = document.getElementById("ad-click");
const adSkipElement = document.getElementById("ad-skip");
const adInfoElement = document.getElementById("ad-info");

adIconElement.hidden = true;
adClickElement.hidden = true;
adSkipElement.hidden = true;

let player, datazoomContext, currentAdObject;

mediatailor.setLogLevel(mediatailor.LogLevel.DEBUG);

mediatailor.initPal(null, palConsentSettings);

mediatailor.createSession(sessionConfig).then(
    session => {
        player = videojs("video", {}, () => {
            // Datazoom SDK initialization
            datazoomContext = datazoom.createContext(player);
            datazoomContext.attachMediaTailorSession(session);
            // Start OM Session Client
            datazoomContext.startOmidSessionClient({
                omidServiceWindow: window.self,
                videoElement: document.getElementById("video"),
                contentURL: location.href,
                accessModeHandler: (url, vendor, params) => "full"
            });
            // Start playback
            player.src({ src: session.getPlaybackUrl(), type: "application/x-mpegURL" });

        });

        // Handle ad clicks
        adClickElement.onclick = event => {
            player.pause();
            session.onVideoClick(event);
        };
        player.on("click", event => {
            if (event.target.tagName === "VIDEO") {
                // Note: Uncomment the next line if ad-click-through should be allowed by clicking
                //       on any point within the video area.
                // session.onVideoClick(event);
            }
            else {
                session.onPlayerControlClick(event);
            }
        });

        function setSeekbarVisibility(visible) {
            if (visible) {
                player.controlBar.progressControl.show();
            }
            else {
                player.controlBar.progressControl.hide();
            }
        }

        function updateAdSkipButtonText(toSkipThreshold) {
            adSkipElement.innerHTML =
                toSkipThreshold? `Skip Ad (in ${Math.round(toSkipThreshold)})` : "Skip Ad";
        }

        function updateAdInfo(adData, adCountdown) {
            adInfoElement.innerHTML =
                `Ad ${adData.availAdIndex + 1}/${adData.availAdCount}, Remains: ad ` +
                `${Math.round(adCountdown.toAdEnd)}, avail ${Math.round(adCountdown.toAvailEnd)}`;
        }

        player.on("seeked", event => {
            adInfoElement.innerHTML = "";
        });

        // Handle MediaTailor session events
        session.addEventListener(mediatailor.SessionUiEvent.AD_START, event => {
            console.log("AD_START: "+event.detail.adElapsedTime, event.detail);
            currentAdObject = event.detail.adObject;
            setSeekbarVisibility(false);
            adIconElement.hidden = false;
            if (currentAdObject.adClickthroughUrl) {
                adClickElement.hidden = false;
            }
            const adCountdown = event.detail.adCountdown;
            if (adCountdown.toSkipThreshold != null) {
                adSkipElement.disabled = true;
                adSkipElement.hidden = false;
                updateAdSkipButtonText(adCountdown.toSkipThreshold);
            }
            updateAdInfo(currentAdObject.adData, adCountdown);
        });
        session.addEventListener(mediatailor.SessionUiEvent.AD_END, event => {
            console.log("AD_END", event.detail);
            currentAdObject = null;
            setSeekbarVisibility(true);
            adIconElement.hidden = true;
            adClickElement.hidden = true;
            adSkipElement.hidden = true;
            adInfoElement.innerHTML = "";
        });
        session.addEventListener(mediatailor.SessionUiEvent.AD_PROGRESS, event => {
            console.log("AD_PROGRESS: "+event.detail.adElapsedTime, event.detail);
            const adCountdown = event.detail.adCountdown;
            if (adCountdown.toSkipThreshold != null) {
                updateAdSkipButtonText(adCountdown.toSkipThreshold);
            }
            updateAdInfo(currentAdObject.adData, adCountdown);
        });
        session.addEventListener(mediatailor.SessionUiEvent.AD_CLICK, event => {
            console.log("AD_CLICK", event.detail);
            if (event.detail.adClickthroughUrl) {
                window.open(event.detail.adClickthroughUrl, "_blank");
                session.onAdClickthrough();
            }
        });
        session.addEventListener(mediatailor.SessionUiEvent.AD_CAN_SKIP, event => {
            console.log("AD_CAN_SKIP", event.detail);
            adSkipElement.onclick = () => {
                if (currentAdObject) {
                    player.currentTime(currentAdObject.targetPlayheadForAdSkip);
                    session.onAdSkip();
                }
            };
            adSkipElement.disabled = false;
        });
        session.addEventListener(mediatailor.SessionUiEvent.AD_INCOMING, event => {
            adInfoElement.innerHTML = `Incoming Ads in ${Math.round(event.detail.timeToNextAd)}`;
        });
    },
    error => {
        console.error(`Session initialization error`, error);
    }
);
})();