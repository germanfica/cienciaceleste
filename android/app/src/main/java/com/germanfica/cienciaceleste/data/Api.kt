package com.germanfica.cienciaceleste.data

import retrofit2.http.GET
import retrofit2.http.Url

interface CienciaCelesteApi {
    @GET suspend fun getIndexPage(@Url url: String): IndexPage
    @GET suspend fun getDoc(@Url url: String): Doc
}
