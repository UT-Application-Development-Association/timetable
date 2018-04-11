import {Component, OnInit, ViewChild} from "@angular/core";
import {TimetableComponent} from "./components/timetable/timetable.component";
import {parseCourse, UofT} from "./models/course";
import {CourseService} from "./services/course.service";
import {Constraint, CourseSolution, ExhaustiveSolver, StepHeuristicSolver} from "./course-arrange";
import {Term} from "./models/term";
import {environment} from "../environments/environment";
import {LogLevelDesc} from "loglevel";
import log = require("loglevel");
import _ = require("lodash");


@Component({
    selector: 'app-root',
    templateUrl: './app.component.html',
    styleUrls: ['./app.component.css']
})
export class AppComponent implements OnInit {
    /**
     * A set of selected courses string in course bar
     * @type {string[]}
     */
    selectedCourses: string[];

    /**
     * Controlling term panel
     */
    terms: Term[];
    activeTerm: Term;

    /**
     * Search-bar loading spin
     * @type {boolean}
     */
    loading: boolean = false;
    @ViewChild(TimetableComponent) timetable: TimetableComponent;

    /**
     * Current constraint list
     * Used by constraint.component
     */
    constraints: Constraint[];

    /**
     * Current solution displaying on the right part of main screen
     * Consumed by timetable.component
     */
    activeSolution: CourseSolution;
    /**
     * Currently displayed solution list on the scroll bar
     */
    solutions: CourseSolution[];

    constructor(private courseService: CourseService,) {
        this.terms = Term.getTerms();
        this.activeTerm = this.terms[0];
        this.selectedCourses = this.courseService.loadCourseList();
        this.constraints = [];
    }


    ngOnInit(): void {
        log.setLevel(<LogLevelDesc>environment.logLevel);
    }

    /**
     * Evaluate solution with given course list
     */
    private eval(courses: UofT.Course[]): CourseSolution[] {
        const parsedCourses = courses.map(parseCourse);
        // Try Exhaustive Solver first
        const exSolver = new ExhaustiveSolver(parsedCourses);
        try {
            return exSolver.solve(this.constraints);
        } catch (e) {
            log.info("ExhaustiveSolver failed");
            log.info(e);
            log.info("try heuristic solver");
            // If input too large, then use heuristic solver
            const heSolver = new StepHeuristicSolver(parsedCourses);
            return heSolver.solve(this.constraints);
        }
    }

    getSolution() {
        Promise.all(this.activeCourses().map(this.courseService.fetchCourseBody))
            .then(courses => {
                this.solutions = this.eval(_.flatten(courses));

                if (this.solutions.length > 0)
                    this.activeSolution = this.solutions[0];
            });
    }

    activeCourses() {
        return this.selectedCourses.filter(c => {
            return this.courseTerm(c).includes(this.activeTerm);
        });
    }

    selectTerm(term: Term) {
        this.activeTerm = term;
        // this.timetable.renderSolution(0, this.activeTerm);
    }

    /**
     * Extract term information from course code
     * @param code full course code
     * @return {Term[]} which term the course belongs to
     */
    private courseTerm(code): Term[] {
        if (code.indexOf("H1F") > -1) return [this.terms[0]];
        if (code.indexOf("H1S") > -1) return [this.terms[1]];
        if (code.indexOf("Y1Y") > -1) return this.terms;
        else {
            log.warn("Unrecognizable course term for course " + code);
            return [];
        }
    }

    deleteCourse(course: string): void {
        const courses = this.selectedCourses;
        courses.splice(courses.indexOf(course), 1);
        this.courseService.storeCourseList(this.selectedCourses);
    }

    addCourse(course: UofT.Course): void {
        this.selectedCourses.push(course.code);
        this.courseService.storeCourseList(this.selectedCourses);
    }

}
