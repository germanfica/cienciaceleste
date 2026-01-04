package com.germanfica.cienciaceleste.ui

sealed class Route(val path: String) {
    data object Home : Route("home")
    data object DivinasLeyes : Route("divinasLeyes/{page}") { fun of(page: Int) = "divinasLeyes/$page" }
    data object Rollos : Route("rollos/{page}") { fun of(page: Int) = "rollos/$page" }
    data object Minirollos : Route("minirollos/{page}") { fun of(page: Int) = "minirollos/$page" }
    data object RolloDetalle : Route("rollo/{id}") { fun of(id: Int) = "rollo/$id" }
    data object MinirolloDetalle : Route("minirollo/{id}") { fun of(id: Int) = "minirollo/$id" }
}
