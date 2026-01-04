package com.germanfica.cienciaceleste.data

class Repository(private val api: CienciaCelesteApi) {

    fun divinasLeyesUrl(page: Int) = RemoteConfig.BASE_JSON + "divinas-leyes/index/pages/$page.json"
    fun rollosUrl(page: Int) = RemoteConfig.BASE_JSON + "rollo/index/pages/$page.json"
    fun minirollosUrl(page: Int) = RemoteConfig.BASE_JSON + "divino-minirollo/index/pages/$page.json"

    fun rolloDocUrl(id: Int) = RemoteConfig.BASE_JSON + "rollo/$id.json"
    fun minirolloDocUrl(id: Int) = RemoteConfig.BASE_JSON + "divino-minirollo/$id.json"

    suspend fun getDivinasLeyes(page: Int) = api.getIndexPage(divinasLeyesUrl(page))
    suspend fun getRollos(page: Int) = api.getIndexPage(rollosUrl(page))
    suspend fun getMinirollos(page: Int) = api.getIndexPage(minirollosUrl(page))

    suspend fun getRollo(id: Int) = api.getDoc(rolloDocUrl(id))
    suspend fun getMinirollo(id: Int) = api.getDoc(minirolloDocUrl(id))
}
