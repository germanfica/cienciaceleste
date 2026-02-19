package com.germanfica.cienciaceleste.data

import android.content.Context

fun Context.readAssetText(path: String): String =
    assets.open(path).bufferedReader(Charsets.UTF_8).use { it.readText() }
