---
title: Reading I2S audio on an ESP32
date: 2026-10-30
tags: [esp32, audio]
---

Wire the mic, install the driver, read samples. This post lives in its own folder, so files next to it work with relative links.

```c
i2s_config_t cfg = {
  .mode = I2S_MODE_MASTER | I2S_MODE_RX,
  .sample_rate = 16000,
};
i2s_driver_install(I2S_NUM_0, &cfg, 0, NULL);
```

Download: [wiring notes](files/wiring.txt)
