package com.germanfica.cienciaceleste.ui

import androidx.compose.foundation.layout.*
import androidx.compose.material3.Text
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.navigation.NavController
import coil.compose.AsyncImage
import com.germanfica.cienciaceleste.data.*
import com.germanfica.cienciaceleste.ui.theme.AzulTexto

@Composable
fun RolloDetalleScreen(nav: NavController, repo: Repository, id: Int) {
    DocScreen(topImageUrl = RemoteConfig.TOPLONG, load = { repo.getRollo(id) })
}

@Composable
fun MinirolloDetalleScreen(nav: NavController, repo: Repository, id: Int) {
    DocScreen(topImageUrl = RemoteConfig.TOPLONG3, load = { repo.getMinirollo(id) })
}

@Composable
private fun DocScreen(
    topImageUrl: String,
    load: suspend () -> Doc
) {
    var doc by remember { mutableStateOf<Doc?>(null) }
    var error by remember { mutableStateOf<String?>(null) }

    LaunchedEffect(Unit) {
        error = null
        doc = null
        try {
            doc = load()
        } catch (t: Throwable) {
            error = t.message ?: "Error"
        }
    }

    FrameScaffold(topImageUrl = topImageUrl) {
        when {
            error != null -> Text("Error: $error")
            doc == null -> Text("Cargando...")
            else -> DocRenderer(doc!!)
        }
    }
}

@Composable
private fun DocRenderer(d: Doc) {
    // titulo (similar a tu h1)
    if (!d.titulo.isNullOrBlank()) {
        Text(d.titulo!!, fontSize = 20.sp, color = AzulTexto)
        Spacer(Modifier.height(12.dp))
    }

    d.bloques.forEach { b ->
        when (b.t) {
            "h1", "h2", "h3" -> {
                Text(b.text.orEmpty(), fontSize = 18.sp, color = AzulTexto)
                Spacer(Modifier.height(10.dp))
            }
            "p" -> {
                Text(inlinesToPlainText(b.inlines), fontSize = 16.sp)
                Spacer(Modifier.height(10.dp))
            }
            "img" -> {
                val url = resolveImg(b.src)
                if (url != null) {
                    AsyncImage(model = url, contentDescription = b.alt, modifier = Modifier.fillMaxWidth())
                    Spacer(Modifier.height(14.dp))
                }
            }
            "blockquote" -> {
                Text(inlinesToPlainText(b.inlines), fontSize = 16.sp)
                Spacer(Modifier.height(10.dp))
            }
            "ul", "ol" -> {
                b.items.orEmpty().forEach { line ->
                    Text("• " + inlinesToPlainText(line), fontSize = 16.sp)
                    Spacer(Modifier.height(6.dp))
                }
                Spacer(Modifier.height(10.dp))
            }
            "code" -> {
                Text(b.code.orEmpty(), fontSize = 14.sp)
                Spacer(Modifier.height(10.dp))
            }
        }
    }

    if (!d.autor.isNullOrBlank()) {
        Spacer(Modifier.height(16.dp))
        Text("Escribe: ${d.autor}", fontSize = 16.sp)
    }
}

private fun inlinesToPlainText(inlines: List<Inline>?): String =
    inlines.orEmpty().joinToString("") { it.text }

private fun resolveImg(src: String?): String? {
    if (src.isNullOrBlank()) return null
    return if (src.startsWith("http")) src else (RemoteConfig.BASE_IMG + src.trimStart('/'))
}
