package co.edu.unibarranquilla.taskserverkotlin

import org.springframework.boot.autoconfigure.SpringBootApplication
import org.springframework.boot.runApplication
import org.springframework.scheduling.annotation.EnableScheduling

@SpringBootApplication
@EnableScheduling
class TaskServerKotlinApplication

fun main(args: Array<String>) {
    runApplication<TaskServerKotlinApplication>(*args)
}
