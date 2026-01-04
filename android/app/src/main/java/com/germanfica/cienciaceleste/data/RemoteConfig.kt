package com.germanfica.cienciaceleste.data

object RemoteConfig {
    // Donde vas a publicar los JSON (ajustalo cuando los tengas listos)
    const val BASE_JSON = "https://germanfica.com/cienciaceleste/docs/"

    // Donde estan las imagenes (esta ya existe en tu sitio)
    const val BASE_IMG = "https://germanfica.com/cienciaceleste/images/"

    // Headers/footers (esta se ve funcionando en tu home)
    const val TOPLONG = BASE_IMG + "toplong.jpg"
    const val BOTTOM_ONLY = BASE_IMG + "bottomlongonly.jpg"
    // Fondolong/toplong2/toplong3: dejalos configurables hasta que confirmes rutas finales
    const val FONDO_LONG = BASE_IMG + "fondolong.jpg"
    const val TOPLONG2 = BASE_IMG + "toplong2.jpg"
    const val TOPLONG3 = BASE_IMG + "toplong3.jpg"
}
