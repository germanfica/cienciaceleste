package com.germanfica.cienciaceleste.ui

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.material3.Text
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.intl.Locale
import androidx.compose.ui.text.intl.LocaleList
import androidx.compose.ui.text.style.Hyphens
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextDecoration
import androidx.compose.ui.text.style.TextDirection
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
        Text(d.titulo!!, fontSize = 20.sp, color = AzulTexto, style = TextStyle(
            //fontWeight = FontWeight.Bold,
            lineHeight = 24.sp, // okay grandecito
            //lineHeight = 26.sp, // okay grandecito
            textDecoration = TextDecoration.Underline,
            textAlign = TextAlign.Justify,
            hyphens = Hyphens.Auto,
            textDirection = TextDirection.ContentOrLtr,
            localeList = LocaleList(Locale("es")),
        ))
        Spacer(Modifier.height(12.dp))
    }

    val paragraphStyle = TextStyle(
        fontSize = 20.sp,
        //fontSize = 22.sp,
        //fontSize = 16.sp,
        //lineHeight = 22.sp, // peque
        lineHeight = 24.sp, // okay grandecito
        //lineHeight = 18.sp,
        textAlign = TextAlign.Justify,
        hyphens = Hyphens.Auto,
        textDirection = TextDirection.ContentOrLtr,
        localeList = LocaleList(Locale("es")),
        // lineBreak = LineBreak.Paragraph,
    )

    d.bloques.forEach { b ->
        when (b.t) {
//            "h1", "h2", "h3" -> {
//                Text(b.text.orEmpty(), fontSize = 18.sp, color = AzulTexto)
//                Spacer(Modifier.height(10.dp))
//            }
            "p" -> {
                Text(
                    text = inlinesToPlainText(b.inlines),
                    modifier = Modifier.fillMaxWidth().background(androidx.compose.ui.graphics.Color(0x2200FF00)),
                    style = paragraphStyle
                )
                //Spacer(Modifier.height(10.dp))
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
        Text("Escribe: ${d.autor}", fontSize = 20.sp, modifier = Modifier.fillMaxWidth(), textAlign = TextAlign.End)
    }
}

private fun inlinesToPlainText(inlines: List<Inline>?): String =
    inlines.orEmpty().joinToString("") { it.text }

private fun resolveImg(src: String?): String? {
    if (src.isNullOrBlank()) return null
    return if (src.startsWith("http")) src else (RemoteConfig.BASE_IMG + src.trimStart('/'))
}