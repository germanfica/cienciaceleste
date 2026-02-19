package com.germanfica.cienciaceleste.data

import android.content.Context
import com.squareup.moshi.Moshi
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext

class Repository(
    private val api: CienciaCelesteApi,
    private val appContext: Context,
    private val moshi: Moshi
) {
    // ===== URLs online =====
    fun divinasLeyesUrl(page: Int) = RemoteConfig.BASE_JSON + "divinas-leyes/index/pages/$page.json"
    fun rollosUrl(page: Int) = RemoteConfig.BASE_JSON + "rollo/index/pages/$page.json"
    fun minirollosUrl(page: Int) = RemoteConfig.BASE_JSON + "divino-minirollo/index/pages/$page.json"
    fun rolloDocUrl(id: Int) = RemoteConfig.BASE_JSON + "rollo/$id.json"
    fun minirolloDocUrl(id: Int) = RemoteConfig.BASE_JSON + "divino-minirollo/$id.json"

    // ===== Paths offline (assets) =====
    private fun divinasLeyesAsset(page: Int) = "docs/divinas-leyes/index/pages/$page.json"
    private fun rollosAsset(page: Int) = "docs/rollo/index/pages/$page.json"
    private fun minirollosAsset(page: Int) = "docs/divino-minirollo/index/pages/$page.json"
    private fun rolloDocAsset(id: Int) = "docs/rollo/$id.json"
    private fun minirolloDocAsset(id: Int) = "docs/divino-minirollo/$id.json"

    private val indexAdapter = moshi.adapter(IndexPage::class.java)
    private val docAdapter = moshi.adapter(Doc::class.java)

    // ===== OFFLINE por defecto (mismos nombres que ya usa tu UI) =====
    suspend fun getDivinasLeyes(page: Int) = readIndexFromAssets(divinasLeyesAsset(page))
    suspend fun getRollos(page: Int) = readIndexFromAssets(rollosAsset(page))
    suspend fun getMinirollos(page: Int) = readIndexFromAssets(minirollosAsset(page))

    suspend fun getRollo(id: Int) = readDocFromAssets(rolloDocAsset(id))
    suspend fun getMinirollo(id: Int) = readDocFromAssets(minirolloDocAsset(id))

    // ===== ONLINE =====
    suspend fun getDivinasLeyesOnline(page: Int) = api.getIndexPage(divinasLeyesUrl(page))
    suspend fun getRollosOnline(page: Int) = api.getIndexPage(rollosUrl(page))
    suspend fun getMinirollosOnline(page: Int) = api.getIndexPage(minirollosUrl(page))

    suspend fun getRolloOnline(id: Int) = api.getDoc(rolloDocUrl(id))
    suspend fun getMinirolloOnline(id: Int) = api.getDoc(minirolloDocUrl(id))

    // ===== helpers =====
    private suspend fun readIndexFromAssets(path: String): IndexPage = withContext(Dispatchers.IO) {
        val json = appContext.readAssetText(path)
        indexAdapter.fromJson(json) ?: error("No se pudo parsear IndexPage: $path")
    }

    private suspend fun readDocFromAssets(path: String): Doc = withContext(Dispatchers.IO) {
        val json = appContext.readAssetText(path)
        docAdapter.fromJson(json) ?: error("No se pudo parsear Doc: $path")
    }
}
