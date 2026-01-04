package com.germanfica.cienciaceleste

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import com.germanfica.cienciaceleste.ui.theme.CienciaCelesteTheme
import androidx.navigation.NavType
import androidx.navigation.compose.*
import androidx.navigation.navArgument
import com.germanfica.cienciaceleste.data.Network
import com.germanfica.cienciaceleste.data.Repository
import com.germanfica.cienciaceleste.ui.*

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        val repo = Repository(Network.api)

        setContent {
            CienciaCelesteTheme {
                val nav = rememberNavController()

                NavHost(navController = nav, startDestination = Route.Home.path) {
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
            }
        }
    }
}
