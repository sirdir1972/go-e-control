# ioBroker go-eCharger PV Surplus Control Script

This script is designed to manage and control a go-eCharger wallbox based on available solar surplus power. It integrates with ioBroker, communicates directly with the go-eCharger HTTP API, and adjusts charging behavior dynamically.

## Features

- Direct control of go-eCharger over local HTTP API
- Dynamically starts and stops charging based on available solar power
- Adjusts charging current between defined limits (e.g., 6–16A)
- Remembers and restores original kWh limit and amp setting
- ioBroker state integration for visualization and control
- Basic fail-safe logic with confirmation counters
- Scheduled execution using ioBroker's `schedule()` function

## Requirements

- go-eCharger with accessible IP on local network
- ioBroker with JavaScript adapter
- A state (`solarExcess`) providing the current solar surplus in watts

## Configuration

Update the following section to match your system:

```js
const ConfigData = {
    statePath: "0_userdata.0.go-e.",
    solarExcess: "0_userdata.0.sumpower.solarExcess",
    RunEvery: 20,
    minExtra: 700,
    minAmps: 6,
    maxAmps: 16,
    maxMissing: -100,
    excessMissingTimes: 3,
    excessConfirmTimes: 3
};
```

Also set the correct IP address for your charger:

```js
const chargerIP = "192.168.1.251";
```

## ioBroker States Created

The script creates and uses these states under the configured `statePath`:

- `control` (boolean) — turns charging automation on or off
- `Debug` (boolean) — enables debug logging
- `charging` (boolean) — tracks current charging status
- `currA` (number) — currently set charging amps
- `oldkWh`, `oldPower` — stores previous settings for restoring
- `car` (string) — charger "car connected" state

## How it Works

- Checks every `RunEvery` seconds
- If `control` is enabled and a car is connected:
  - Starts charging if surplus is over `minExtra` for `excessConfirmTimes`
  - Stops charging if shortfall exceeds `maxMissing` and amps are at `minAmps` for `excessMissingTimes`
  - Adjusts amps up/down to match surplus in real time
- Restores original settings when turning off control

## API Usage

Uses go-eCharger local API:

- `/api/status?filter=xyz` — for current status fields
- `/api/set?amp=X` — to set charging amps
- `/api/set?dwo=Y` — to set kWh limit
- `/api/set?frc=1` — stop charging
- `/api/set?frc=2` — start charging

## License

(c) 2025 siridr  
Use and adapt freely for personal or non-commercial use.