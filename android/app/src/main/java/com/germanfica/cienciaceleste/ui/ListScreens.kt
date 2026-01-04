package com.germanfica.cienciaceleste.ui

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.material3.Text
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.navigation.NavController
import com.germanfica.cienciaceleste.data.*
import com.germanfica.cienciaceleste.ui.theme.AzulTexto

@Composable
fun DivinasLeyesScreen(nav: NavController, repo: Repository, page: Int) {
    IndexScreen(
        nav = nav,
        topImageUrl = RemoteConfig.TOPLONG2,
        page = page,
        load = { repo.getDivinasLeyes(page) },
        onItemClick = null
    ) { p -> Route.DivinasLeyes.of(p) }
}

@Composable
fun RollosScreen(nav: NavController, repo: Repository, page: Int) {
    IndexScreen(
        nav = nav,
        topImageUrl = RemoteConfig.TOPLONG,
        page = page,
        load = { repo.getRollos(page) },
        onItemClick = { id -> nav.navigate(Route.RolloDetalle.of(id)) }
    ) { p -> Route.Rollos.of(p) }
}

@Composable
fun MinirollosScreen(nav: NavController, repo: Repository, page: Int) {
    IndexScreen(
        nav = nav,
        topImageUrl = RemoteConfig.TOPLONG3,
        page = page,
        load = { repo.getMinirollos(page) },
        onItemClick = { id -> nav.navigate(Route.MinirolloDetalle.of(id)) }
    ) { p -> Route.Minirollos.of(p) }
}

@Composable
private fun IndexScreen(
    nav: NavController,
    topImageUrl: String,
    page: Int,
    load: suspend () -> IndexPage,
    onItemClick: ((Int) -> Unit)?,
    routeForPage: (Int) -> String
) {
    val scope = rememberCoroutineScope()
    var state by remember { mutableStateOf<IndexPage?>(null) }
    var error by remember { mutableStateOf<String?>(null) }

    LaunchedEffect(page) {
        error = null
        state = null
        try {
            state = load()
        } catch (t: Throwable) {
            error = t.message ?: "Error"
        }
    }

    FrameScaffold(topImageUrl = topImageUrl) {
        when {
            error != null -> Text("Error: $error")
            state == null -> Text("Cargando...")
            else -> {
                val p = state!!

                Paginator(
                    page = p.page,
                    pages = p.pages,
                    hasPrev = p.hasPrev,
                    hasNext = p.hasNext,
                    onGo = { target -> nav.navigate(routeForPage(target)) }
                )

                Spacer(Modifier.height(10.dp))

                p.items.forEach { row ->
                    Row(
                        Modifier.fillMaxWidth()
                            .then(if (onItemClick != null) Modifier.clickable { onItemClick(row.id) } else Modifier)
                            .padding(vertical = 6.dp)
                    ) {
                        Text("${row.id}  ", fontSize = 18.sp, color = AzulTexto)
                        Text(row.titulo, fontSize = 18.sp, color = AzulTexto)
                    }
                }

                Spacer(Modifier.height(10.dp))

                Paginator(
                    page = p.page,
                    pages = p.pages,
                    hasPrev = p.hasPrev,
                    hasNext = p.hasNext,
                    onGo = { target -> nav.navigate(routeForPage(target)) }
                )
            }
        }
    }
}

@Composable
private fun Paginator(
    page: Int,
    pages: List<Int>,
    hasPrev: Boolean,
    hasNext: Boolean,
    onGo: (Int) -> Unit
) {
    Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.End) {
        if (hasPrev) {
            Text("< Anterior", modifier = Modifier.clickable { onGo(page - 1) })
            Spacer(Modifier.width(12.dp))
        }
        pages.forEach { n ->
            val m = if (n == page) Modifier else Modifier.clickable { onGo(n) }
            Text("$n", modifier = m.padding(horizontal = 6.dp))
        }
        if (hasNext) {
            Spacer(Modifier.width(12.dp))
            Text("Siguiente >", modifier = Modifier.clickable { onGo(page + 1) })
        }
    }
}
