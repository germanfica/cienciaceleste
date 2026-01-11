package com.germanfica.cienciaceleste

import android.os.Bundle
import android.util.Log
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.animation.core.animateDpAsState
import androidx.compose.animation.core.tween
import androidx.compose.foundation.background
import androidx.compose.foundation.gestures.awaitFirstDown
import androidx.compose.foundation.gestures.detectHorizontalDragGestures
import androidx.compose.foundation.gestures.detectTapGestures
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.offset
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.statusBars
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.layout.windowInsetsPadding
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Menu
import androidx.compose.material3.DrawerValue
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.ModalNavigationDrawer
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.input.pointer.positionChange
import androidx.compose.ui.unit.dp
import androidx.navigation.NavGraph.Companion.findStartDestination
import androidx.navigation.NavType
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.currentBackStackEntryAsState
import androidx.navigation.compose.rememberNavController
import androidx.navigation.navArgument
import com.germanfica.cienciaceleste.data.Network
import com.germanfica.cienciaceleste.data.Repository
import com.germanfica.cienciaceleste.ui.*
import com.germanfica.cienciaceleste.ui.theme.CienciaCelesteTheme
import kotlinx.coroutines.launch

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        val repo = Repository(Network.api)

        setContent {
            CienciaCelesteTheme {
                val nav = rememberNavController()
                var blockSystemGesture = true
                val drawerState = remember { mutableStateOf(DrawerValue.Closed) }
                val scope = rememberCoroutineScope()
                val backStackEntry by nav.currentBackStackEntryAsState()
                val currentRoute = backStackEntry?.destination?.route

                fun navigateFromDrawer(route: String) {
                    nav.navigate(route) {
                        popUpTo(nav.graph.findStartDestination().id) { saveState = true }
                        launchSingleTop = true
                        restoreState = true
                    }
                }

                Scaffold { padding ->
                    Box(modifier = Modifier.fillMaxSize()) {

                        // 1️⃣ CONTENIDO PRINCIPAL
                        NavHost(
                            navController = nav,
                            startDestination = Route.Home.path,
                            modifier = Modifier.fillMaxSize()
                        ) {
                            composable(Route.Home.path) { HomeScreen(nav) }

                            composable(
                                Route.DivinasLeyes.path,
                                arguments = listOf(navArgument("page") { type = NavType.IntType })
                            ) { backStack ->
                                val page = backStack.arguments?.getInt("page") ?: 1
                                DivinasLeyesScreen(nav, repo, page)
                            }

                            composable(
                                Route.Rollos.path,
                                arguments = listOf(navArgument("page") { type = NavType.IntType })
                            ) { backStack ->
                                val page = backStack.arguments?.getInt("page") ?: 1
                                RollosScreen(nav, repo, page)
                            }

                            composable(
                                Route.Minirollos.path,
                                arguments = listOf(navArgument("page") { type = NavType.IntType })
                            ) { backStack ->
                                val page = backStack.arguments?.getInt("page") ?: 1
                                MinirollosScreen(nav, repo, page)
                            }

                            composable(
                                Route.RolloDetalle.path,
                                arguments = listOf(navArgument("id") { type = NavType.IntType })
                            ) { backStack ->
                                val id = backStack.arguments?.getInt("id") ?: 1
                                RolloDetalleScreen(nav, repo, id)
                            }

                            composable(
                                Route.MinirolloDetalle.path,
                                arguments = listOf(navArgument("id") { type = NavType.IntType })
                            ) { backStack ->
                                val id = backStack.arguments?.getInt("id") ?: 1
                                MinirolloDetalleScreen(nav, repo, id)
                            }
                        }

                        // 2️⃣ SCRIM PROPIO (CIERRA)
                        if (drawerState.value == DrawerValue.Open) {
                            Box(
                                modifier = Modifier
                                    .fillMaxSize()
                                    .background(Color.Black.copy(alpha = 0.45f))
                                    .pointerInput(Unit) {
                                        detectTapGestures {
                                            drawerState.value = DrawerValue.Closed
                                        }
                                    }
                            )
                        }

                        // 3️⃣ DRAWER (APARECE DESDE LA IZQUIERDA)
                        val drawerWidth = 280.dp
                        val offsetX by animateDpAsState(
                            targetValue =
                                if (drawerState.value == DrawerValue.Open) 0.dp else -drawerWidth,
                            animationSpec = tween(140),
                            label = "drawerOffset"
                        )

                        Box(
                            modifier = Modifier
                                .offset(x = offsetX)
                                .width(drawerWidth)
                                .fillMaxHeight()
                                .background(MaterialTheme.colorScheme.surface)
                        ) {
                            AppDrawer(
                                currentRoute = currentRoute,
                                onNavigate = { route ->
                                    drawerState.value = DrawerValue.Closed
                                    navigateFromDrawer(route)
                                }
                            )
                        }

                        // 4️⃣ BORDE IZQUIERDO – ABRIR (GESTO PROPIO)
                        Box(
                            modifier = Modifier
                                .fillMaxHeight()
                                .width(32.dp)
                                .align(Alignment.CenterStart)
                                .pointerInput(Unit) {
                                    detectHorizontalDragGestures { _, dragAmount ->
                                        if (dragAmount > 8 && drawerState.value == DrawerValue.Closed) {
                                            drawerState.value = DrawerValue.Open
                                        }
                                    }
                                }
                        )

                        // 5️⃣ APP BAR – ABRIR / CERRAR
                        SimpleAppBar(
                            onClick = {
                                drawerState.value =
                                    if (drawerState.value == DrawerValue.Closed)
                                        DrawerValue.Open
                                    else
                                        DrawerValue.Closed
                            },
                            modifier = Modifier
                                .align(Alignment.TopStart)
                                .windowInsetsPadding(WindowInsets.statusBars)
                                .padding(start = 16.dp, end = 16.dp, bottom = 16.dp)
                        )
                    }
                }
            }
        }
    }

    private fun titleForRoute(route: String?): String {
        return when {
            route == null -> "Ciencia Celeste"
            route == "home" -> "Ciencia Celeste"
            route.startsWith("divinasLeyes") -> "Divinas leyes"
            route.startsWith("rollos") || route.startsWith("rollo") -> "Divinos rollos telepaticos"
            route.startsWith("minirollos") || route.startsWith("minirollo") -> "Divinos mini rollos"
            else -> "Ciencia Celeste"
        }
    }
}