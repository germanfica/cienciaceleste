package com.germanfica.cienciaceleste.data

import com.squareup.moshi.Moshi
import retrofit2.Retrofit
import retrofit2.converter.moshi.MoshiConverterFactory

object Network {
    val moshi: Moshi = Moshi.Builder().build()

    val api: CienciaCelesteApi = Retrofit.Builder()
        // baseUrl obligatorio aunque uses @Url
        .baseUrl("https://germanfica.com/")
        .addConverterFactory(MoshiConverterFactory.create(moshi))
        .build()
        .create(CienciaCelesteApi::class.java)
}
