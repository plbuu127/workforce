// Fixed fictional scenario; the selected answer uses the same planner as company cases.
export function demoProfile(previous_end='unknown') {
 return {location:'korea',goal:'change_employer',reported_status:'E-7-1',new_job_title:'Software engineer',job_changed:'no',registered:'yes',previous_end};
}
export function demoSessionUI(previousSession,nextSession,ui){
 if(!nextSession||!previousSession||previousSession.expires_at!==nextSession.expires_at)return {role:'employee',restartOpen:false};
 return ui;
}
