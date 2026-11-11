import test from "node:test";
import assert from "node:assert/strict";
import {
  getAcademyAssessment,
  getAcademyAssessmentStats,
  getAcademyCourseIds,
  gradeAcademyAssessment,
  normalizeAcademyAssessmentState,
  serializeAcademyAssessmentState
} from "../academy-assessments.mjs";

test("six learning paths provide five-question assessments and capstone projects",()=>{
  assert.deepEqual(getAcademyAssessmentStats(),{courses:6,questions:30,projects:6});
  assert.deepEqual(getAcademyCourseIds(),["html","css","javascript","git","linux","web-security"]);
  for(const id of getAcademyCourseIds()){
    const assessment=getAcademyAssessment(id);
    assert.equal(assessment.questions.length,5);
    assert.ok(assessment.project.title.length>5);
    assert.ok(assessment.project.deliverables.length>=4);
    assert.ok(assessment.project.rubric.length>=3);
    for(const question of assessment.questions){
      assert.equal(question.options.length,4);
      assert.ok(question.answer>=0&&question.answer<question.options.length);
      assert.ok(question.explanation.length>10);
    }
  }
  assert.equal(getAcademyAssessment("unknown"),null);
});

test("grading calculates score and requires eighty percent to pass",()=>{
  const assessment=getAcademyAssessment("html");
  const allCorrect=Object.fromEntries(assessment.questions.map(q=>[q.id,q.answer]));
  const passed=gradeAcademyAssessment("html",allCorrect);
  assert.equal(passed.score,100);
  assert.equal(passed.passed,true);
  assert.equal(passed.correct,5);
  const partial={...allCorrect,[assessment.questions[0].id]: (assessment.questions[0].answer+1)%4};
  const failed=gradeAcademyAssessment("html",partial);
  assert.equal(failed.score,80);
  assert.equal(failed.passed,true);
  const twoWrong={...partial,[assessment.questions[1].id]:(assessment.questions[1].answer+1)%4};
  const notPassed=gradeAcademyAssessment("html",twoWrong);
  assert.equal(notPassed.score,60);
  assert.equal(notPassed.passed,false);
  assert.equal(gradeAcademyAssessment("missing",{}),null);
});

test("invalid and missing answers are scored as unanswered without executing content",()=>{
  const assessment=getAcademyAssessment("css");
  const result=gradeAcademyAssessment("css",{[assessment.questions[0].id]:999,unexpected:"<script>"});
  assert.equal(result.correct,0);
  assert.equal(result.details[0].selected,null);
  assert.equal(result.details[0].correct,false);
  assert.equal(result.details[0].explanation,assessment.questions[0].explanation);
});

test("assessment and capstone progress normalization is bounded and course-scoped",()=>{
  const normalized=normalizeAcademyAssessmentState({
    results:{
      html:{score:100,attempts:2,completedAt:"2026-11-11T12:00:00.000Z"},
      css:{score:120,attempts:1},
      unknown:{score:90,attempts:1}
    },
    projects:{html:[0,1,1,-1,999,"2"],unknown:[0]}
  });
  assert.deepEqual(normalized.results.html,{score:100,passed:true,attempts:2,completedAt:"2026-11-11T12:00:00.000Z"});
  assert.equal(normalized.results.css,undefined);
  assert.equal(normalized.results.unknown,undefined);
  assert.deepEqual(normalized.projects.html,[0,1]);
  assert.equal(normalized.projects.unknown,undefined);
  assert.deepEqual(normalizeAcademyAssessmentState("not-json"),{results:{},projects:{}});
  assert.deepEqual(normalizeAcademyAssessmentState("x".repeat(12001)),{results:{},projects:{}});
  assert.deepEqual(normalizeAcademyAssessmentState(serializeAcademyAssessmentState(normalized)),normalized);
});

test("assessment data is immutable and project checks do not imply a passed exam",()=>{
  const assessment=getAcademyAssessment("linux");
  assert.equal(Object.isFrozen(assessment),true);
  assert.equal(Object.isFrozen(assessment.questions),true);
  const state=normalizeAcademyAssessmentState({projects:{linux:[0,1,2,3,4]}});
  assert.deepEqual(state.projects.linux,[0,1,2,3,4]);
  assert.equal(state.results.linux,undefined);
});
