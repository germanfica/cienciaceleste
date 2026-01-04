package com.germanfica.cienciaceleste.data

import com.squareup.moshi.JsonClass

@JsonClass(generateAdapter = true)
data class IndexItem(
    val id: Int,
    val titulo: String
)

@JsonClass(generateAdapter = true)
data class IndexPage(
    val page: Int,
    val hasPrev: Boolean,
    val hasNext: Boolean,
    val items: List<IndexItem>,
    val pages: List<Int> = emptyList()
)

data class Inline(
    val t: String,      // "text" | "strong" | "em" | "code" | "link"
    val text: String,
    val href: String? = null
)

data class Block(
    val t: String,      // "h1" | "h2" | "p" | "ul" | "ol" | "img" | "code" | "blockquote"
    val id: String? = null,
    val text: String? = null,
    val inlines: List<Inline>? = null,
    val items: List<List<Inline>>? = null,
    val src: String? = null,
    val alt: String? = null,
    val lang: String? = null,
    val code: String? = null
)

data class Doc(
    val id: Int,
    val titulo: String? = null,
    val autor: String? = null,
    val bloques: List<Block> = emptyList()
)
