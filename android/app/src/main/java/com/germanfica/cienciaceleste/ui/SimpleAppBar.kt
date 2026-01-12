package com.germanfica.cienciaceleste.ui

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.size
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.ShortText
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material.icons.automirrored.outlined.ShortText
import androidx.compose.ui.Alignment

@Composable
fun SimpleAppBar(
    onClick: () -> Unit,
    expandHitArea: Boolean,
    modifier: Modifier = Modifier
) {
    Box(
        modifier = modifier.then(if (expandHitArea) Modifier.fillMaxWidth() else Modifier),
        contentAlignment = Alignment.CenterStart
    ) {
        Surface(
            modifier = Modifier
                .size(48.dp)
                //.size(50.dp)
                //.size(56.dp)
                .clip(CircleShape),
            shape = CircleShape,
            //color = MaterialTheme.colorScheme.surface.copy(alpha = 0.18f),

            color = MaterialTheme.colorScheme.surface.copy(alpha = 0.9f),
            border = BorderStroke(1.dp, MaterialTheme.colorScheme.outline.copy(alpha = 0.35f)),
            shadowElevation = 0.dp
        ) {
            IconButton(onClick = onClick) {
                Icon(
                    imageVector = Icons.AutoMirrored.Outlined.ShortText,
                    contentDescription = "Abrir menu",
                    //tint = Color(0xFFE3E3E3)

                    tint = MaterialTheme.colorScheme.onSurface
                )
            }
        }
    }
}
