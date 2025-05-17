// (c) 2025 siridr
// v0.1 // control go-e charger 

const ConfigData = {
    statePath: "0_userdata.0.go-e.",
    solarExcess: "0_userdata.0.sumpower.solarExcess",
    RunEvery: 20,
    minExtra: 700,
    minAmps: 6,
    maxAmps: 16,
    maxMissing: -100,
    excessMissingTimes: 3,          // how often too little before stopping
    excessConfirmTimes: 3           // how often enough before starting
};
const axios = require('axios');  // Verwenden von axios für HTTP-Anfragen
// IP-Adresse der go-e Wallbox
const chargerIP = "192.168.1.251";
const apiUrl = `http://${chargerIP}/api/status`;  // URL für den Status
const apiControlUrl = `http://${chargerIP}/api/set`;  // URL für Steuerbefehle

function logDebug(message) {
    const debugEnabled = getMyState("Debug")
    if (debugEnabled) {
        log(message);
    }
}
function initMyObjectAsNumber(myObject, myValue) {
    let myvar = ConfigData.statePath + myObject 
    if(!existsState(myvar)) {
       createState(myvar, myValue, {type: "number"})
       logDebug ("creating object: " + myvar + " as number")
    } else {
      //  logDebug ("anscheinend existiert " + myvar + " schon")
    }
}

function initMyObjectAsBoolean(myObject, myValue) {
    let myvar = ConfigData.statePath + myObject 
    if(!existsState(myvar)) {
       createState(myvar, myValue, {type: "boolean"})
       logDebug("creating object: " + myvar + " as boolean")
    } else {
     //logDebug("anscheinend existiert " + myvar + " schon")
    }
}
function initMyObjectAsString(myObject, myValue)
{
    let myvar = ConfigData.statePath + myObject 
    if(!existsState(myvar)) {
       createState(myvar, myValue, {type: "string"})
       logDebug("creating object: " + myvar + " as string")
    } else {
     //logDebug("anscheinend existiert " + myvar + " schon")
    }
}

// Funktion zum Abrufen des Wallbox-Status
async function getChargerStatus() {
    try {
        // API-Anfrage senden, um den Status abzurufen
        const response = await axios.get(apiUrl+'?filter=dwo');
        
        // Überprüfen, ob die Antwort erfolgreich war
        if (response.status === 200) {
            const statusData = response.data;
            // Ausgabe des Status im logDebug()-Format
            logDebug(`Charger Status: ${JSON.stringify(statusData, null, 2)}`);
            return(statusData)
        } else {
            logDebug(`Fehler beim Abrufen des Status. HTTP-Statuscode: ${response.status}`, "error");
        }
    } catch (error) {
        logDebug(`Fehler beim Abrufen des Status: ${error.message}`, "error");
    }
}
async function getChargerStatusField(field) {
    try {
        // API-Anfrage senden, um den Status abzurufen
        const myUrl= apiUrl + '?filter='+field
//logDebug(myUrl)
        const response = await axios.get(myUrl);
        // Überprüfen, ob die Antwort erfolgreich war
        if (response.status === 200) {
            const statusData = response.data;
            // Ausgabe des Status im logDebug()-Format
            //logDebug(`Charger Status: ${JSON.stringify(statusData, null, 2)}`);
            logDebug(field + ": " + statusData[field])
            return(statusData[field])
        } else {
            logDebug(`Fehler beim Abrufen des Status. HTTP-Statuscode: ${response.status}`, "error");
        }
    } catch (error) {
        logDebug(`Fehler beim Abrufen des Status: ${error.message}`, "error");
    }
}


// Funktion zum Setzen der Ladegeschwindigkeit in Ampere
async function setChargingCurrent(amps) {
    try {
        // Steuerbefehl senden, um die Ladegeschwindigkeit zu setzen
        const response = await axios.get(`${apiControlUrl}?amp=${amps}`);

        if (response.status === 200) {
            logDebug(`Ladegeschwindigkeit auf ${amps} Ampere gesetzt.`);
        } else {
            logDebug(`Fehler beim Setzen der Ladegeschwindigkeit. HTTP-Statuscode: ${response.status}`, "error");
        }
    } catch (error) {
        logDebug(`Fehler beim Setzen der Ladegeschwindigkeit: ${error.message}`, "error");
    }
}

// Funktion zum Setzen der Ladegrenze in kWh
async function setkWh(kWh) {
    try {
        // Steuerbefehl senden, um die Ladegeschwindigkeit zu setzen
        const response = await axios.get(`${apiControlUrl}?dwo=${kWh}`);

        if (response.status === 200) {
            logDebug(`Ladegrenze auf ${kWh} kWh gesetzt.`);
        } else {
            logDebug(`Fehler beim Setzen der Ladegrenze. HTTP-Statuscode: ${response.status}`, "error");
        }
    } catch (error) {
        logDebug(`Fehler beim Setzen der Ladegegrenze: ${error.message}`, "error");
    }
}

initMyObjectAsNumber("oldkWh",0)
initMyObjectAsNumber("oldPower",0)
initMyObjectAsNumber('currA',0)
initMyObjectAsString('car',"")
initMyObjectAsBoolean("Debug",true)
initMyObjectAsBoolean('control',false)
initMyObjectAsBoolean('oldvalueset',false)
initMyObjectAsBoolean('charging',false)
initMyObjectAsNumber("excessMissingCounter", 0);

async function setControlValues() {
    try {
        const dwoold = await getChargerStatusField('dwo');
        logDebug('dwoold: ' + dwoold);
        setMyState("oldkWh", toInt(dwoold));
        await setkWh(0);  

        const ampold = await getChargerStatusField('amp');
        logDebug('ampold: ' + ampold);
        setMyState("oldPower", toInt(ampold));
        await setChargingCurrent(8); 
        setMyState("currA", ConfigData.minAmps);
        setMyState('oldvalueset', false);

    } catch (error) {
        log(`Fehler in setControlValues: ${error.message}`, 'error');
    }
}

async function setOldValues() {
    const oldkWh = getMyState('oldkWh')
    const oldPower = getMyState('oldPower')
    setChargingCurrent(oldPower)
    setMyState("currA",oldPower)
    await setkWh(oldkWh)
    setMyState('oldvalueset',true)
}

schedstring = '*/' + ConfigData.RunEvery + ' * * * * *' 
schedule(schedstring, function () {
            controlCharge();
});

async function getAmps() {
    try {
        const currA = await getChargerStatusField('amp');
        logDebug('CurrA: ' + currA);
        setMyState("currA", toInt(currA));
        return toInt(currA);  // Optional: Rückgabe, falls du den Wert brauchst
    } catch (error) {
        log(`Fehler in getAmps(): ${error.message}`, "error");
        return null;
    }
}

function setMyState(state,param) {
    setState(ConfigData.statePath + state, param)
}

async function stopCharging() {
    try {
    // Steuerbefehl senden, um die Ladegeschwindigkeit zu setzen
    const response = await axios.get(`${apiControlUrl}?frc=1`);

    if (response.status === 200) {
        logDebug(`Ladeden gestoppt`);
        setMyState('charging',false)
    } else {
        logDebug(`Fehler beim Setzen des Ladestops HTTP-Statuscode: ${response.status}`, "error");
    }
} catch (error) {
        logDebug(`Fehler beim Setzen des Ladestops: ${error.message}`, "error");
    }
}

async function startCharging() {
    try {
    // Steuerbefehl senden, um die Ladegeschwindigkeit zu setzen
    const response = await axios.get(`${apiControlUrl}?frc=2`);

    if (response.status === 200) {
        logDebug(`Ladeden gestartet`);
        setMyState('charging',true)
    } else {
        logDebug(`Fehler beim Setzen des Ladestart HTTP-Statuscode: ${response.status}`, "error");
    }
} catch (error) {
        logDebug(`Fehler beim Setzen des Ladestops: ${error.message}`, "error");
    }
}


function getMyState(param) {
    const myState = getState(ConfigData.statePath+param).val
    return myState
}

async function controlGoE() {
    try {
        const car = await getChargerStatusField('car');
        setMyState("car", car.toString());

        if (toInt(car) === 2) {
            const solExtra = getState(ConfigData.solarExcess).val;

            const oldcurrA = getMyState('currA');
            let currA = oldcurrA;

            logDebug("extra: " + solExtra);
            logDebug('currA: ' + currA);

            if (solExtra > 230) {
                currA += 1;
            } else if (solExtra < ConfigData.maxMissing) {
                currA -= 1;
            }

            currA = Math.max(ConfigData.minAmps, Math.min(currA, ConfigData.maxAmps));

            if (currA !== oldcurrA) {
                await setChargingCurrent(currA);
                setMyState("currA", currA);
            }
        }
    } catch (error) {
        log("Fehler in controlGoE(): " + error.message, "error");
    }
}

let startConfirmationCounter = 0; 
let excessMissingCounter = 0;
async function controlCharge() {
    const control = getMyState('control');
    const oldvalueset = getMyState('oldvalueset');

    // === Case 1: Charging control is OFF ===
    if (!control) {
        if (!oldvalueset) {
            // Restore wallbox settings and stop charging
            await setOldValues();
            await stopCharging();
            logDebug('Control off');
        }
        return; // Exit early
    }

    // === From here: Charging control is ON ===

    await getAmps();  // Get current charging amps

    const charging = getMyState('charging');
    const solExtra = getState(ConfigData.solarExcess).val;
    const currA = getMyState('currA');

  // === Case 2: Car is NOT currently charging ===
if (!charging) {
    if (solExtra >= ConfigData.minExtra) {
        startConfirmationCounter++;
        logDebug(`enough extra (${startConfirmationCounter}/${ConfigData.excessConfirmTimes})`);

        if (startConfirmationCounter >= ConfigData.excessConfirmTimes) {
            logDebug('enough extra confirmed, starting charge');
            await setControlValues();
            await startCharging();
            excessMissingCounter = 0; // Reset stop-counter
            startConfirmationCounter = 0; // Reset start-counter
        }
    } else {
        if (startConfirmationCounter > 0) {
            logDebug('extra dropped again, resetting start counter');
        }
        startConfirmationCounter = 0;
        logDebug('not enough extra');
    }
}
    // === Case 3: Car IS currently charging ===
    else {
        if (solExtra < ConfigData.maxMissing && currA === ConfigData.minAmps) {
            // Too little power and already at minimum charging current – count failures
            excessMissingCounter += 1;
 
            if (excessMissingCounter >= ConfigData.excessMissingTimes) {
                // Stop charging after too many failures
                await stopCharging();
                setMyState('charging', false);
                logDebug(`not enough extra ${excessMissingCounter} times in a row – stopping charge`);
                excessMissingCounter = 0; // Reset counter
 
            } else {
                // Still waiting – not yet enough to stop
                logDebug(`not enough extra (${excessMissingCounter}/${ConfigData.excessMissingTimes}) – waiting`);
            }
        } else {
            // Still enough power to continue – reset counter and adjust amps
            excessMissingCounter = 0;
            logDebug('keeping charging');
            await controlGoE();
        }
    }
}


