/******/ (() => { // webpackBootstrap
/******/ 	var __webpack_modules__ = ({

/***/ 228:
/***/ ((module, __unused_webpack_exports, __nccwpck_require__) => {

const {IncomingWebhook} = __nccwpck_require__(225);
const {context: github} = __nccwpck_require__(469);
const core = __nccwpck_require__(564);

const placeholder = '';
const {
  payload: {
    repository = {
      html_url: placeholder,
      name: placeholder
    },
    compare,
    sender = {
      login: placeholder,
      url: placeholder
    },
    commits = [],
    head_commit = {
      timestamp: placeholder
    }
  },
  eventName,
  workflow
} = github;

const statuses = [{
  id: 'success',
  icon: '✓',
  activityTitle: 'Success!',
  activitySubtitle: head_commit.timestamp,
  activityImage: 'https://raw.githubusercontent.com/Skitionek/notify-microsoft-teams/master/icons/success.png'

}, {
  id: 'failure',
  icon: '✗',
  activityTitle: 'Failure',
  activitySubtitle: head_commit.timestamp,
  activityImage: 'https://raw.githubusercontent.com/Skitionek/notify-microsoft-teams/master/icons/failure.png'

}, {
  id: 'cancelled',
  icon: 'o',
  activityTitle: 'Cancelled',
  activitySubtitle: head_commit.timestamp,
  activityImage: 'https://raw.githubusercontent.com/Skitionek/notify-microsoft-teams/master/icons/cancelled.png'
}, {
  id: 'skipped',
  icon: '⤼',
  activityTitle: 'Skipped',
  activitySubtitle: head_commit.timestamp,
  activityImage: 'https://raw.githubusercontent.com/Skitionek/notify-microsoft-teams/master/icons/skipped.png'
}, {
  id: 'unknown',
  icon: '?',
  activityTitle: 'No job context has been provided',
  activitySubtitle: head_commit.timestamp,
  activityImage: 'https://raw.githubusercontent.com/Skitionek/notify-microsoft-teams/master/icons/unknown.png'
}];

function Status(status) {
  if (!status) {
    core.error(`Unknown status value: ${status}`);
    return statuses.find(({id}) => id === 'unknown');
  }
  const r = statuses.find(({id}) => id === status.toLowerCase());
  if (!r) {
    core.error(`Not implemented status value: ${status}`);
    return statuses.find(({id}) => id === 'unknown');
  }
  return r;
}

const repository_link = `[${repository.full_name}](${repository.html_url})`;
const changelog = commits.length ? `**Changelog:**${commits.reduce((o, c) => console.dir(c) || o + '\n+ ' + c.message, '\n')}` : undefined;
const outputs2markdown = (outputs) => Object.keys(outputs).reduce((o, output_name) => o + `+ ${output_name}:${'\n'}\`\`\`${outputs[output_name]}\`\`\``, '');

const truncateString = (str, maxLength) => {
  if (str.length > maxLength) {
    return str.slice(0, maxLength - 3) + '...';
  }
  return str;
};

const summary_generator = (obj, status_key) => {
  const r = {
    type: 'FactSet',
    facts: []
  };
  Object.keys(obj).forEach(step_id => {
    const status = Status(obj[step_id][status_key]);
    r.facts.push({
      title: `${status.icon} ${truncateString(step_id, 15)}`,
      value: status.activityTitle
    });
    if (status.id === 'failure' && obj[step_id].outputs.length) {
      let text = `${step_id}:\n`;
      text += outputs2markdown(obj[step_id].outputs);
      if (text !== '')
        r.facts.push = ({
          type: 'TextBlock',
          text: text
        });
    }
  });
  if (!r.facts.length) return [];
  return [r];
};

const emailsToText = (emails) => {
  if (!emails || !emails.length)
    return '';

  return emails.map(email => `<at>${email}</at>`)
    .reduce((previous, current) => `${previous} ${current}`);
};

const emailsToMsTeamsEntities = (emails) => {
  return emails.map((email) => {
    return {
      type: 'mention',
      text: `<at>${email}</at>`,
      mentioned: {
        id: email,
        name: email
      }
    };
  });
};

const statusSummary = (job) => {
  const {
    activityTitle, activitySubtitle, activityImage, color
  } = Status(job.status);
  return [
    {
      type: 'ColumnSet',
      columns: [
        {
          type: 'Column',
          items: [
            {
              type: 'Image',
              style: 'person',
              url: activityImage,
              altText: 'Result',
              size: 'small'
            }
          ],
          width: 'auto'
        },
        {
          type: 'Column',
          items: [
            {
              type: 'TextBlock',
              weight: 'bolder',
              text: activityTitle
            },
            {
              type: 'TextBlock',
              text: activitySubtitle
            }
          ],
          width: 'stretch'
        }
      ]
    }
  ];
};

const csvToArray = (csv) => {
  return csv.replaceAll(' ', '').split(',');
};

class MSTeams {
  /**
   * Generate msteams payload
   * @param job
   * @param steps
   * @param needs
   * @param title {string} msteams message title
   * @param msteams_emails {string} msteams emails in CSV
   * @return
   */
  async generatePayload({
                          job = {status: 'unknown'},
                          steps = {},
                          needs = {},
                          title = '',
                          msteams_emails = '',
                          repo_link = ''
                        }) {
    const steps_summary = summary_generator(steps, 'outcome');
    const needs_summary = summary_generator(needs, 'result');
    const status_summary = statusSummary(job);

    const commitChangeLog = changelog ?
      [
        {
          type: 'TextBlock',
          weight: 'lighter',
          text: changelog,
          wrap: true
        }
      ] : [];

    const mentionedIds = msteams_emails.length > 1 ?
      [{
        type: 'TextBlock',
        text: emailsToText(csvToArray(msteams_emails)),
        wrap: true
      }] : [];

    const headerTitle = {
      type: 'TextBlock',
      size: 'Medium',
      weight: 'Bolder',
      text: title !== '' ? title : `${sender.login} ${eventName} initialised workflow"${workflow}"`,
      style: 'heading',
      wrap: true
    };

    const repositoryLink = {
      type: 'TextBlock',
      size: 'Medium',
      weight: 'lighter',
      text: repo_link !== '' ? repo_link : repository_link
    };

    const actionLinks = {
      type: 'ActionSet',
      actions: [
        {
          type: 'Action.OpenUrl',
          title: 'Repository',
          url: repository.html_url
        },
        {
          type: 'Action.OpenUrl',
          title: 'Compare',
          url: compare
        }
      ]
    };

    const entities = msteams_emails.length > 0 ? emailsToMsTeamsEntities(csvToArray(msteams_emails)) : [{}];

    return {
      'type': 'message',
      attachments: [{
        contentType: 'application/vnd.microsoft.card.adaptive',
        content: {
          type: 'AdaptiveCard',
          body: [
            {
              type: 'Container',
              items: [
                headerTitle,
                repositoryLink,
                ...commitChangeLog,
                ...steps_summary,
                ...needs_summary,
                ...status_summary,
                actionLinks,
                ...mentionedIds
              ]
            }
          ],
          '$schema': 'http://adaptivecards.io/schemas/adaptive-card.json',
          version: '1.5',
          msteams: {
            width: 'Full',
            entities: entities
          }
        }
      }]
    };
  }

  /**
   * Notify information about github actions to MSTeams
   * @param url
   * @param  payload
   * @returns {Promise} result
   */
  async notify(url, payload) {
    const client = new IncomingWebhook(url);
    const response = await client.send(payload);

    if (!response.text) {
      throw new Error('Failed to send notification to Microsoft Teams.\n' + 'Response:\n' + JSON.stringify(response, null, 2));
    }
  }
}

module.exports = MSTeams;


/***/ }),

/***/ 564:
/***/ ((module) => {

module.exports = eval("require")("@actions/core");


/***/ }),

/***/ 469:
/***/ ((module) => {

module.exports = eval("require")("@actions/github");


/***/ }),

/***/ 225:
/***/ ((module) => {

module.exports = eval("require")("ms-teams-webhook");


/***/ })

/******/ 	});
/************************************************************************/
/******/ 	// The module cache
/******/ 	var __webpack_module_cache__ = {};
/******/ 	
/******/ 	// The require function
/******/ 	function __nccwpck_require__(moduleId) {
/******/ 		// Check if module is in cache
/******/ 		var cachedModule = __webpack_module_cache__[moduleId];
/******/ 		if (cachedModule !== undefined) {
/******/ 			return cachedModule.exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = __webpack_module_cache__[moduleId] = {
/******/ 			// no module.id needed
/******/ 			// no module.loaded needed
/******/ 			exports: {}
/******/ 		};
/******/ 	
/******/ 		// Execute the module function
/******/ 		var threw = true;
/******/ 		try {
/******/ 			__webpack_modules__[moduleId](module, module.exports, __nccwpck_require__);
/******/ 			threw = false;
/******/ 		} finally {
/******/ 			if(threw) delete __webpack_module_cache__[moduleId];
/******/ 		}
/******/ 	
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/ 	
/************************************************************************/
/******/ 	/* webpack/runtime/compat */
/******/ 	
/******/ 	if (typeof __nccwpck_require__ !== 'undefined') __nccwpck_require__.ab = __dirname + "/";
/******/ 	
/************************************************************************/
var __webpack_exports__ = {};
// This entry need to be wrapped in an IIFE because it need to be isolated against other modules in the chunk.
(() => {
const core = __nccwpck_require__(564);
const MSTeams = __nccwpck_require__(228);

const missing_functionality_warning = objective =>
	core.warning(`Missing ${objective} parameter will result in reduced functionality.`) || {};

const access_context = context_name => {
	let context = core.getInput(context_name);
	if (!context) missing_functionality_warning(context_name);
	return context === '' ? {} : JSON.parse(context);
};

async function run() {
	try {
		const webhook_url = process.env.MSTEAMS_WEBHOOK || core.getInput('webhook_url');
		if (webhook_url === '') {
			throw new Error(
				'[Error] Missing Microsoft Teams Incoming Webhooks URL.\n' +
				'Please configure "MSTEAMS_WEBHOOK" as environment variable or\n' +
				'specify the key called "webhook_url" in "with" section.'
			);
		}

		let job = access_context('job');
		let steps = access_context('steps');
		let needs = access_context('needs');

		let title = core.getInput('title');
		let msteams_emails= core.getInput('msteams_emails');
		let repository_link= core.getInput('repository_link');
		let raw = core.getInput('raw');
		let dry_run = core.getInput('dry_run');

		core.info(`Parsed params:\n${JSON.stringify({
			webhook_url: '***',
			job,
			steps,
			needs,
			raw,
			title,
			msteams_emails,
			dry_run
		})}`);

		const msteams = new MSTeams();
		let payload;
		if (raw === '') {
			payload = await msteams.generatePayload(
				{
					job,
					steps,
					needs,
					title,
					msteams_emails,
					repository_link
				}
			);
		} else {
			payload = Object.assign({}, msteams.header, JSON.parse(raw));
		}

		core.info(`Generated payload for Microsoft Teams:\n${JSON.stringify(payload, null, 2)}`);

		if (dry_run === '' || dry_run==='false') {
			await msteams.notify(webhook_url, payload);
			core.info('Sent message to Microsoft Teams');
		} else {
			core.info('Dry run - skipping notification send. Done.');
		}
	} catch (err) {
		core.setFailed(err.message);
	}
}

run();

})();

module.exports = __webpack_exports__;
/******/ })()
;